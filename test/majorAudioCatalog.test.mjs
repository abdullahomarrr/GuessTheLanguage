import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(
  readFileSync(join(projectRoot, 'src', 'data', 'majorSourcedAudioCatalog.json'), 'utf8')
);
const targets = JSON.parse(
  readFileSync(join(projectRoot, 'data-pipeline', 'config', 'major_language_targets.json'), 'utf8')
);

test('every acquired major-language recording is stored, traceable, and owner-approved', () => {
  assert.equal(new Set(catalog.map((record) => record.clipId)).size, catalog.length);
  assert.equal(new Set(catalog.map((record) => record.languageId)).size, catalog.length);

  for (const record of catalog) {
    assert.match(record.audioUrl, /^\/audio\/major\/[a-z]{3}\.(wav|mp3)$/);
    assert.ok(record.sourceName);
    assert.ok(record.sourceUrl);
    assert.ok(record.license);
    assert.ok(record.transcriptOriginal);
    assert.equal(record.moderationStatus, 'APPROVED');
    assert.equal(record.previewOnly, false);
    assert.equal(record.verification.approvedForGame, true);
    assert.equal(record.verification.reviewStatus, 'APPROVED');

    const filePath = join(projectRoot, 'public', ...record.audioUrl.split('/').filter(Boolean));
    assert.ok(existsSync(filePath), `missing ${record.audioUrl}`);
    const contents = readFileSync(filePath);
    assert.equal(contents.length, record.sizeBytes);
    assert.equal(createHash('sha256').update(contents).digest('hex'), record.sha256);
  }
});

test('major-language acquisition has real files for every target except Tigrinya', () => {
  assert.equal(catalog.length, 61);
  const stored = new Set(catalog.map((record) => record.languageId));
  assert.deepEqual(
    targets.filter((target) => !stored.has(target.id)).map((target) => target.id),
    ['lang_tigrinya']
  );
});
