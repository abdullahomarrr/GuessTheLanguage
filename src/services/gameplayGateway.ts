import { CountryGuess, GuessResult } from '@/types';
import { challengeRepository, IChallengeRepository } from '@/services/challengeRepository';
import { languageRepository, ILanguageRepository } from '@/services/languageRepository';
import { GeoHintEngine } from '@/services/geoHintEngine';

export interface EvaluateGuessRequest {
  challengeId: string;
  country: CountryGuess;
  attemptNumber: number;
}

/**
 * Client implementation of the future gameplay API boundary. A production
 * adapter can POST this request to a server and return the same GuessResult
 * without exposing the challenge answer or geo comparison logic to the client.
 */
export interface IGameplayGateway {
  evaluateCountryGuess(request: EvaluateGuessRequest): Promise<GuessResult>;
}

export class LocalGameplayGateway implements IGameplayGateway {
  constructor(
    private readonly challenges: IChallengeRepository,
    private readonly languages: ILanguageRepository
  ) {}

  async evaluateCountryGuess(request: EvaluateGuessRequest): Promise<GuessResult> {
    const challenge = await this.challenges.getChallengeById(request.challengeId);
    if (!challenge || !challenge.active) throw new Error('Challenge is unavailable.');

    const targetLanguage = await this.languages.getLanguage(challenge.languageId);
    if (!targetLanguage) throw new Error('Challenge answer is unavailable.');

    const targetAnchor = challenge.answerGeoAnchor;
    if (!targetAnchor) {
      throw new Error('Challenge answer geography is unavailable.');
    }

    return GeoHintEngine.compare(
      request.country,
      targetAnchor,
      request.attemptNumber,
      targetLanguage.geoHintType
    );
  }
}

export const gameplayGateway = new LocalGameplayGateway(
  challengeRepository,
  languageRepository
);
