import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const currentCatalog = JSON.parse(
  readFileSync(join(projectRoot, 'src', 'data', 'sourcedAudioCatalog.json'), 'utf8')
);
const targets = JSON.parse(
  readFileSync(join(projectRoot, 'data-pipeline', 'config', 'major_language_targets.json'), 'utf8')
);

test('major-language expansion adds 62 unique targets without duplicating the current catalog', () => {
  assert.equal(targets.length, 62);
  assert.equal(new Set(targets.map((target) => target.id)).size, targets.length);
  assert.equal(new Set(targets.map((target) => target.iso6393)).size, targets.length);

  const currentIds = new Set(currentCatalog.map((record) => record.languageId));
  const currentCodes = new Set(currentCatalog.map((record) => record.languageIso));
  for (const target of targets) {
    assert.ok(target.id.startsWith('lang_'));
    assert.match(target.iso6393, /^[a-z]{3}$/);
    assert.ok(target.name);
    assert.ok(target.regions.length > 0);
    assert.equal(currentIds.has(target.id), false, `duplicate language ID ${target.id}`);
    assert.equal(currentCodes.has(target.iso6393), false, `duplicate ISO code ${target.iso6393}`);
  }

  assert.equal(currentCatalog.length + targets.length, 84);
});
