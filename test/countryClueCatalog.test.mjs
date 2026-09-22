import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const catalog = JSON.parse(fs.readFileSync(new URL('../src/data/countryClueFacts.json', import.meta.url), 'utf8'));

test('country clue catalog contains every normalized playable answer country', () => {
  const major = JSON.parse(fs.readFileSync(new URL('../src/data/majorLanguageMetadata.json', import.meta.url), 'utf8'));
  const mockSource = fs.readFileSync(new URL('../src/data/mockLanguages.ts', import.meta.url), 'utf8');
  const mockNames = [...mockSource.matchAll(/countryName:\s*'([^']+)'/g)].map((match) => match[1]);
  const expected = [...new Set([...major.map((item) => item.geoAnchor.countryName), ...mockNames].map((name) => name === 'Turkey' ? 'Türkiye' : name))].sort();
  const actual = catalog.map((item) => item.countryName).sort();
  assert.deepEqual(actual, expected);
});

test('every country profile has the core deterministic facts', () => {
  for (const profile of catalog) {
    assert.match(profile.countryCode, /^[A-Z]{2}$/);
    assert.ok(profile.capital, `${profile.countryName} is missing a capital`);
    assert.ok(profile.currencies.length, `${profile.countryName} is missing currency data`);
    assert.ok(profile.languages.length, `${profile.countryName} is missing language data`);
    assert.ok(profile.population.value > 0, `${profile.countryName} is missing population data`);
    assert.ok(profile.region && profile.subregion, `${profile.countryName} is missing region data`);
    assert.ok(profile.areaKm2 > 0, `${profile.countryName} is missing area data`);
    assert.ok(['left', 'right'].includes(profile.drivingSide), `${profile.countryName} is missing driving-side data`);
  }
});

test('cultural facts have broad catalog coverage and provenance', () => {
  assert.ok(catalog.filter((item) => item.religions).length >= 65);
  assert.ok(catalog.filter((item) => item.associatedDishes.length).length >= 60);
  for (const profile of catalog) {
    assert.ok(profile.sources.referenceData);
    assert.ok(profile.sources.population);
  }
});
