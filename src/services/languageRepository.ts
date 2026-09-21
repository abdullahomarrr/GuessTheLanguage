import countries from 'world-countries';
import { CountryGuess, Language, LanguageVariant } from '@/types';
import { MOCK_LANGUAGES } from '@/data/mockLanguages';

export interface ILanguageRepository {
  searchLanguages(query: string, limit?: number): Promise<Language[]>;
  getLanguage(id: string): Promise<Language | null>;
  getAllLanguages(): Promise<Language[]>;
  getAliases(id: string): Promise<string[]>;
  getVariants(id: string): Promise<LanguageVariant[]>;
  getLanguageByIso6393(code: string): Promise<Language | null>;
  getLanguageByGlottocode(glottocode: string): Promise<Language | null>;
  searchCountries(query: string, limit?: number): Promise<CountryGuess[]>;
  getAllCountries(): Promise<CountryGuess[]>;
}

export class MockLanguageRepository implements ILanguageRepository {
  private languages: Language[];
  private countries: CountryGuess[];

  constructor(initialData: Language[] = MOCK_LANGUAGES) {
    this.languages = initialData
      .filter((language) => language.enabled)
      .map((language) => ({
        ...language,
        level: language.level || 'language',
        geography: language.geography || {
          hintType: language.geoHintType,
          anchors: [language.geoAnchor],
          notes: language.geographicNotes,
        },
        sourceMetadata: language.sourceMetadata || {
          name: 'Curated development catalog',
          license: 'Development-only mock data',
        },
      }));
    this.countries = countries
      .filter((country) => country.cca2 && country.latlng.length === 2)
      .map((country) => ({
        id: `country-${country.cca2.toLowerCase()}`,
        name: country.name.common,
        aliases: Array.from(new Set([country.name.official, ...country.altSpellings])),
        geoAnchor: {
          latitude: country.latlng[0],
          longitude: country.latlng[1],
          continent: country.region || 'World',
          countryCode: country.cca2,
          countryName: country.name.common,
          regionName: country.subregion || country.region,
          polygonId: country.ccn3,
        },
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAllLanguages(): Promise<Language[]> {
    return [...this.languages].sort((a, b) =>
      (a.geoAnchor.countryName || a.name).localeCompare(b.geoAnchor.countryName || b.name)
    );
  }

  async getLanguage(id: string): Promise<Language | null> {
    const lang = this.languages.find((l) => l.id === id);
    return lang || null;
  }

  async getAliases(id: string): Promise<string[]> {
    const lang = await this.getLanguage(id);
    return lang ? [...lang.aliases] : [];
  }

  async getVariants(id: string): Promise<LanguageVariant[]> {
    const language = await this.getLanguage(id);
    return language?.variants ? [...language.variants] : [];
  }

  async getLanguageByIso6393(code: string): Promise<Language | null> {
    const normalized = code.trim().toLowerCase();
    return this.languages.find((language) => language.iso6393?.toLowerCase() === normalized) || null;
  }

  async getLanguageByGlottocode(glottocode: string): Promise<Language | null> {
    const normalized = glottocode.trim().toLowerCase();
    return this.languages.find((language) => language.glottocode?.toLowerCase() === normalized) || null;
  }

  async searchLanguages(query: string, limit: number = 8): Promise<Language[]> {
    const q = query.trim().toLowerCase();
    if (!q) {
      return this.languages.slice(0, limit);
    }

    const matches: Array<{ language: Language; score: number }> = [];

    for (const lang of this.languages) {
      let score = 0;
      const lowerCountry = (lang.geoAnchor.countryName || '').toLowerCase();
      const lowerRegion = (lang.geoAnchor.regionName || '').toLowerCase();

      if (lowerCountry === q) {
        score = 100;
      } else if (lowerCountry.startsWith(q)) {
        score = 85;
      } else if (lowerCountry.includes(q)) {
        score = 70;
      } else if (lowerRegion.startsWith(q)) {
        score = 45;
      } else if (lowerRegion.includes(q)) {
        score = 35;
      }

      if (score > 0) {
        matches.push({ language: lang, score });
      }
    }

    matches.sort((a, b) =>
      b.score - a.score ||
      (a.language.geoAnchor.countryName || a.language.name).localeCompare(
        b.language.geoAnchor.countryName || b.language.name
      )
    );
    return matches.slice(0, limit).map((m) => m.language);
  }

  async getAllCountries(): Promise<CountryGuess[]> {
    return [...this.countries];
  }

  async searchCountries(query: string, limit: number = 8): Promise<CountryGuess[]> {
    const q = query.trim().toLowerCase();
    if (!q) return this.countries.slice(0, limit);

    return this.countries
      .map((country) => {
        const name = country.name.toLowerCase();
        let score = name === q ? 100 : name.startsWith(q) ? 85 : name.includes(q) ? 70 : 0;

        for (const alias of country.aliases) {
          const normalizedAlias = alias.toLowerCase();
          if (normalizedAlias === q) score = Math.max(score, 95);
          else if (normalizedAlias.startsWith(q)) score = Math.max(score, 75);
          else if (normalizedAlias.includes(q)) score = Math.max(score, 55);
        }

        return { country, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.country.name.localeCompare(b.country.name))
      .slice(0, limit)
      .map(({ country }) => country);
  }
}

export const languageRepository = new MockLanguageRepository();
