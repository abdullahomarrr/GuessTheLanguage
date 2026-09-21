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

test('every acquired major-language recording is stored, traceable, and review-only', () => {
  assert.equal(new Set(catalog.map((record) => record.clipId)).size, catalog.length);
  assert.equal(new Set(catalog.map((record) => record.languageId)).size, catalog.length);

  for (const record of catalog) {
    assert.match(record.audioUrl, /^\/audio\/major\/[a-z]{3}\.(wav|mp3)$/);
    assert.ok(record.sourceName);
    assert.ok(record.sourceUrl);
    assert.ok(record.license);
    assert.ok(record.transcriptOriginal);
    assert.equal(record.moderationStatus, 'PENDING');
    assert.equal(record.verification.approvedForGame, false);

    const filePath = join(projectRoot, 'public', ...record.audioUrl.split('/').filter(Boolean));
    assert.ok(existsSync(filePath), `missing ${record.audioUrl}`);
    const contents = readFileSync(filePath);
    assert.equal(contents.length, record.sizeBytes);
    assert.equal(createHash('sha256').update(contents).digest('hex'), record.sha256);
  }
});
