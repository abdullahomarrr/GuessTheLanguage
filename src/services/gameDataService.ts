import { AudioClip, DailyChallenge, Language } from '@/types';
import { audioRepository, IAudioRepository } from '@/services/audioRepository';
import { challengeRepository, IChallengeRepository } from '@/services/challengeRepository';
import { languageRepository, ILanguageRepository } from '@/services/languageRepository';
import { isAudioClipPlayable, isLanguagePlayable } from '@/services/catalogPolicy';

export interface DailyGameBundle {
  challenge: DailyChallenge;
  language: Language;
  clip: AudioClip;
}

export interface IGameDataService {
  getDailyGame(date: string): Promise<DailyGameBundle>;
}

export class RepositoryBackedGameDataService implements IGameDataService {
  constructor(
    private readonly challenges: IChallengeRepository,
    private readonly languages: ILanguageRepository,
    private readonly audio: IAudioRepository
  ) {}

  async getDailyGame(date: string): Promise<DailyGameBundle> {
    const challenge = await this.challenges.getDailyChallenge(date);
    if (!challenge.active) throw new Error('Today’s challenge is not active.');

    const [language, clip] = await Promise.all([
      this.languages.getLanguage(challenge.languageId),
      this.audio.getClip(challenge.audioClipId),
    ]);

    if (!language || !isLanguagePlayable(language)) {
      throw new Error('Today’s language is unavailable.');
    }
    if (!clip || !isAudioClipPlayable(clip)) {
      throw new Error('Today’s recording has not passed publication review.');
    }
    if (clip.languageId !== language.id) {
      throw new Error('Challenge language and recording do not match.');
    }
    if (challenge.answerMode === 'SPEAKER_COUNTRY' && !challenge.answerGeoAnchor) {
      throw new Error('Today’s challenge has no reviewed speaker geography.');
    }

    return { challenge, language, clip };
  }
}

export const gameDataService = new RepositoryBackedGameDataService(
  challengeRepository,
  languageRepository,
  audioRepository
);
