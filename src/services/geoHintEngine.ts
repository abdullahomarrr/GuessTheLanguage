import { CountryGuess, GeoAnchor, GeoHintType, GuessResult, ProximityBand } from '@/types';
import { GAME_RULES } from '@/config';

export class GeoHintEngine {
  /**
   * Calculate great-circle distance between two points using the Haversine formula (in kilometers).
   */
  public static calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's mean radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  private static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Determine proximity band (HOT, WARM, COLD) based on distance and configured thresholds.
   */
  public static getProximityBand(distanceKm: number): ProximityBand {
    const { hotKm, warmKm } = GAME_RULES.proximityThresholds;
    if (distanceKm <= hotKm) {
      return 'HOT';
    }
    if (distanceKm <= warmKm) {
      return 'WARM';
    }
    return 'COLD';
  }

  /**
   * Compare the country represented by a guessed entry with today's country.
   * Progressive disclosure rule:
   * - Guesses 1 & 2: Only continent match is provided. Proximity band is undefined.
   * - Guesses 3 & 4: Continent match + proximity band (HOT / WARM / COLD) are provided.
   * - Exact km is calculated internally but never exposed in UI.
   */
  public static compare(
    guessedCountry: CountryGuess,
    targetAnchor: GeoAnchor,
    attemptNumber: number,
    targetGeoHintType: GeoHintType = 'ORIGIN_POINT'
  ): GuessResult {
    const guessedAnchor = guessedCountry.geoAnchor;
    const guessedCountryCode = guessedAnchor.countryCode?.toLowerCase();
    const targetCountryCode = targetAnchor.countryCode?.toLowerCase();
    const isCorrect = Boolean(
      guessedCountryCode && targetCountryCode
        ? guessedCountryCode === targetCountryCode
        : guessedAnchor.countryName && targetAnchor.countryName &&
          guessedAnchor.countryName.toLowerCase() === targetAnchor.countryName.toLowerCase()
    );

    // Check continent match
    const continentMatch =
      guessedAnchor.continent.toLowerCase() === targetAnchor.continent.toLowerCase();

    // Calculate distance
    const distanceKm = this.calculateDistanceKm(
      guessedAnchor.latitude,
      guessedAnchor.longitude,
      targetAnchor.latitude,
      targetAnchor.longitude
    );

    let proximityBand: ProximityBand | undefined = undefined;

    // Reveal proximity only on or after proximityHintStartsAtGuess (e.g. guess 3 and 4)
    if (!isCorrect && attemptNumber >= GAME_RULES.proximityHintStartsAtGuess) {
      if (
        targetGeoHintType !== 'DISABLED'
      ) {
        proximityBand = this.getProximityBand(distanceKm);
      }
    }

    return {
      attemptNumber,
      guessedLanguageId: guessedCountry.id,
      guessedLanguageName: guessedCountry.name,
      guessedCountryName: guessedCountry.name,
      isCorrect,
      continentMatch,
      guessedContinent: guessedAnchor.continent,
      targetContinent: targetAnchor.continent,
      proximityBand,
      distanceKm, // Kept internal in model
      geoAnchor: guessedAnchor,
    };
  }
}
