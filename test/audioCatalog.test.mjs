import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(
  readFileSync(join(projectRoot, 'src', 'data', 'sourcedAudioCatalog.json'), 'utf8')
);

test('sourced audio catalog has one stored recording for every language', () => {
  assert.equal(catalog.length, 22);
  assert.equal(new Set(catalog.map((record) => record.clipId)).size, 22);
  assert.equal(new Set(catalog.map((record) => record.languageId)).size, 22);

  for (const record of catalog) {
    assert.match(record.audioUrl, /^\/audio\/catalog\/[a-z]{3}\.(wav|mp3)$/);
    assert.ok(record.sourceName);
    assert.ok(record.sourceUrl);
    assert.ok(record.license);
    assert.ok(record.creator);
    assert.ok(record.transcriptOriginal);
    assert.ok(record.translationEnglish);

    const filePath = join(projectRoot, 'public', ...record.audioUrl.split('/').filter(Boolean));
    assert.ok(existsSync(filePath), `missing ${record.audioUrl}`);
    const contents = readFileSync(filePath);
    assert.equal(contents.length, record.sizeBytes);
    assert.equal(createHash('sha256').update(contents).digest('hex'), record.sha256);
  }
});

test('only the explicitly owner-approved Urdu recording is production-ready', () => {
  const approved = catalog.filter((record) => record.moderationStatus === 'APPROVED');
  const pending = catalog.filter((record) => record.moderationStatus === 'PENDING');

  assert.deepEqual(approved.map((record) => record.languageId), ['lang_urdu']);
  assert.equal(pending.length, 21);
});
