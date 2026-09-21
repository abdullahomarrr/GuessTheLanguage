import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (...parts) => JSON.parse(readFileSync(join(root, ...parts), 'utf8'));
const pool = [
  ...readJson('src', 'data', 'sourcedAudioCatalog.json'),
  ...readJson('src', 'data', 'majorSourcedAudioCatalog.json'),
].sort((a, b) => a.clipId.localeCompare(b.clipId));
const majorMetadata = readJson('src', 'data', 'majorLanguageMetadata.json');
const mockLanguageSource = readFileSync(join(root, 'src', 'data', 'mockLanguages.ts'), 'utf8');
const originalLanguageIds = new Set(
  [...mockLanguageSource.matchAll(/id: '(lang_[^']+)'/g)].map((match) => match[1])
);

function hashSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledPool(cycle) {
  const shuffled = [...pool];
  const random = seededRandom(hashSeed(`lingo-owner-approved-cycle-${cycle}`));
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

test('daily rotation contains all 83 approved recordings exactly once per cycle', () => {
  assert.equal(pool.length, 83);
  assert.equal(new Set(pool.map((record) => record.clipId)).size, 83);
  assert.ok(pool.every((record) => record.moderationStatus === 'APPROVED'));
  assert.ok(pool.every((record) => record.verification.approvedForGame));

  const cycle = shuffledPool(0);
  assert.equal(new Set(cycle.map((record) => record.clipId)).size, 83);
  assert.notDeepEqual(
    cycle.map((record) => record.clipId),
    shuffledPool(1).map((record) => record.clipId)
  );
});

test('every major recording has playable language and country metadata', () => {
  const metadataById = new Map(majorMetadata.map((language) => [language.id, language]));
  const majorPool = readJson('src', 'data', 'majorSourcedAudioCatalog.json');
  for (const record of majorPool) {
    const language = metadataById.get(record.languageId);
    assert.ok(language, `missing language metadata for ${record.languageId}`);
    assert.ok(language.geoAnchor.countryCode, `missing country for ${record.languageId}`);
  }
});

test('every scheduled recording resolves to playable language metadata', () => {
  const playableIds = new Set([
    ...originalLanguageIds,
    ...majorMetadata.map((language) => language.id),
  ]);
  for (const record of pool) {
    assert.ok(playableIds.has(record.languageId), `missing ${record.languageId}`);
  }
});
