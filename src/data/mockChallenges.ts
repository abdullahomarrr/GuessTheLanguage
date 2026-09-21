import { DailyChallenge } from '@/types';
import { MOCK_LANGUAGES } from '@/data/mockLanguages';

// Until the reviewed catalogue is populated, production is deliberately pinned
// to the one real recording that ships with the app. Never schedule metadata-only
// mock clips: their files do not exist and must not be replaced with synthetic audio.
const CURRENT_PLAYABLE_CHALLENGE = {
  languageId: 'lang_urdu',
  audioClipId: 'clip_urdu_lingualibre_preview',
  difficulty: 'MEDIUM' as const,
};

/**
 * Epoch reference date (Jan 1, 2025 = Challenge #1)
 */
const BASE_DATE = new Date('2025-01-01T00:00:00Z');

export function getChallengeForDate(dateStr: string): DailyChallenge {
  const currentDate = new Date(`${dateStr}T00:00:00Z`);
  const diffTime = Math.abs(currentDate.getTime() - BASE_DATE.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const challengeNumber = diffDays + 1;

  const item = CURRENT_PLAYABLE_CHALLENGE;
  const developmentLanguage = MOCK_LANGUAGES.find((language) => language.id === item.languageId);

  // Development challenges still resolve this from the curated language mock.
  // Database-backed challenges should persist an explicit clip/answer geography.

  return {
    id: `challenge_${dateStr}`,
    date: dateStr,
    challengeNumber,
    languageId: item.languageId,
    audioClipId: item.audioClipId,
    difficulty: item.difficulty,
    aiQuestionLimit: 1,
    proximityHintStartsAtGuess: 3,
    active: true,
    answerMode: 'SPEAKER_COUNTRY',
    answerGeoAnchor: developmentLanguage?.geoAnchor,
    resultMetadata: {
      curatorNote: 'Real Lingua Libre Urdu recording approved for game use by the project owner.',
    },
  };
}
