import { DailyChallenge } from '@/types';
import { PLAYABLE_LANGUAGES } from '@/data/playableLanguages';
import sourcedCatalog from '@/data/sourcedAudioCatalog.json';
import majorSourcedCatalog from '@/data/majorSourcedAudioCatalog.json';

interface ScheduledAudioRecord {
  clipId: string;
  languageId: string;
  sourceName: string;
  moderationStatus: string;
  enabled: boolean;
  verification?: {
    approvedForGame?: boolean;
    reviewStatus?: string;
  };
}

const APPROVED_AUDIO_POOL = ([...sourcedCatalog, ...majorSourcedCatalog] as ScheduledAudioRecord[])
  .filter((record) =>
    record.enabled &&
    record.moderationStatus === 'APPROVED' &&
    record.verification?.approvedForGame &&
    record.verification.reviewStatus === 'APPROVED'
  )
  .sort((a, b) => a.clipId.localeCompare(b.clipId));

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledPool(cycle: number): ScheduledAudioRecord[] {
  const pool = [...APPROVED_AUDIO_POOL];
  const random = seededRandom(hashSeed(`lingo-owner-approved-cycle-${cycle}`));
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool;
}

/**
 * Epoch reference date (Jan 1, 2025 = Challenge #1)
 */
const BASE_DATE = new Date('2025-01-01T00:00:00Z');

export function getChallengeForDate(dateStr: string): DailyChallenge {
  const currentDate = new Date(`${dateStr}T00:00:00Z`);
  const diffTime = currentDate.getTime() - BASE_DATE.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const challengeNumber = diffDays + 1;
  if (APPROVED_AUDIO_POOL.length === 0) {
    throw new Error('No approved recordings are available for daily scheduling.');
  }

  const poolPosition = ((diffDays % APPROVED_AUDIO_POOL.length) + APPROVED_AUDIO_POOL.length) % APPROVED_AUDIO_POOL.length;
  const cycle = Math.floor(diffDays / APPROVED_AUDIO_POOL.length);
  const item = shuffledPool(cycle)[poolPosition];
  const language = PLAYABLE_LANGUAGES.find((candidate) => candidate.id === item.languageId);
  if (!language) {
    throw new Error(`No playable language metadata exists for ${item.languageId}.`);
  }

  return {
    id: `challenge_${dateStr}`,
    date: dateStr,
    challengeNumber,
    languageId: item.languageId,
    audioClipId: item.clipId,
    difficulty: language.difficulty,
    aiQuestionLimit: 1,
    proximityHintStartsAtGuess: 3,
    active: true,
    answerMode: 'SPEAKER_COUNTRY',
    answerGeoAnchor: language.geoAnchor,
    resultMetadata: {
      curatorNote: `Owner-approved human recording sourced from ${item.sourceName}.`,
    },
  };
}
