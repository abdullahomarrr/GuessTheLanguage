import { DailyChallenge } from '@/types';
import { MOCK_LANGUAGES } from '@/data/mockLanguages';

// Curated rotation list ensuring rich diversity (no 5 European languages in a row)
const CURATED_ROTATION: Array<{ languageId: string; audioClipId: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD' }> = [
  { languageId: 'lang_spanish', audioClipId: 'clip_spanish', difficulty: 'EASY' },
  { languageId: 'lang_japanese', audioClipId: 'clip_japanese', difficulty: 'EASY' },
  { languageId: 'lang_swahili', audioClipId: 'clip_swahili', difficulty: 'EASY' },
  { languageId: 'lang_arabic', audioClipId: 'clip_arabic', difficulty: 'EASY' },
  { languageId: 'lang_german', audioClipId: 'clip_german', difficulty: 'EASY' },
  { languageId: 'lang_vietnamese', audioClipId: 'clip_vietnamese', difficulty: 'MEDIUM' },
  { languageId: 'lang_quechua', audioClipId: 'clip_quechua', difficulty: 'HARD' },
  { languageId: 'lang_french', audioClipId: 'clip_french', difficulty: 'EASY' },
  { languageId: 'lang_persian', audioClipId: 'clip_persian', difficulty: 'MEDIUM' },
  { languageId: 'lang_korean', audioClipId: 'clip_korean', difficulty: 'EASY' },
  { languageId: 'lang_yoruba', audioClipId: 'clip_yoruba', difficulty: 'HARD' },
  { languageId: 'lang_italian', audioClipId: 'clip_italian', difficulty: 'EASY' },
  { languageId: 'lang_mandarin', audioClipId: 'clip_mandarin', difficulty: 'EASY' },
  { languageId: 'lang_welsh', audioClipId: 'clip_welsh', difficulty: 'HARD' },
  { languageId: 'lang_amharic', audioClipId: 'clip_amharic', difficulty: 'HARD' },
  { languageId: 'lang_portuguese', audioClipId: 'clip_portuguese', difficulty: 'MEDIUM' },
  { languageId: 'lang_hindi', audioClipId: 'clip_hindi', difficulty: 'EASY' },
  { languageId: 'lang_polish', audioClipId: 'clip_polish', difficulty: 'MEDIUM' },
  { languageId: 'lang_somali', audioClipId: 'clip_somali', difficulty: 'HARD' },
  { languageId: 'lang_turkish', audioClipId: 'clip_turkish', difficulty: 'MEDIUM' },
  { languageId: 'lang_urdu', audioClipId: 'clip_urdu', difficulty: 'MEDIUM' },
  { languageId: 'lang_russian', audioClipId: 'clip_russian', difficulty: 'EASY' },
];

/**
 * Deterministic date string hash to integer index
 */
function getDateHash(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Epoch reference date (Jan 1, 2025 = Challenge #1)
 */
const BASE_DATE = new Date('2025-01-01T00:00:00Z');

export function getChallengeForDate(dateStr: string): DailyChallenge {
  const currentDate = new Date(`${dateStr}T00:00:00Z`);
  const diffTime = Math.abs(currentDate.getTime() - BASE_DATE.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const challengeNumber = diffDays + 1;

  // Use cyclic rotation offset by date hash for stable variety
  const rotationIndex = (diffDays + (getDateHash(dateStr) % 7)) % CURATED_ROTATION.length;
  const scheduledItem = CURATED_ROTATION[rotationIndex];
  const item = process.env.NODE_ENV !== 'production'
    ? {
        languageId: 'lang_urdu',
        audioClipId: 'clip_urdu_lingualibre_preview',
        difficulty: 'MEDIUM' as const,
      }
    : scheduledItem;
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
      curatorNote: process.env.NODE_ENV !== 'production'
        ? 'Development preview using a pending Lingua Libre Urdu candidate.'
        : 'Authentic spoken clip verified for natural cadence and tone.',
    },
  };
}
