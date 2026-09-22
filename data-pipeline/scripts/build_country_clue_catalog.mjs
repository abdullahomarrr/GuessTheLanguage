import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import countries from 'world-countries';

const root = process.cwd();
const factbookRoot = path.join(os.tmpdir(), 'lingo-factbook-json');
const dishesFile = path.join(os.tmpdir(), 'country-by-national-dish.json');
const outputFile = path.join(root, 'src', 'data', 'countryClueFacts.json');

if (!fs.existsSync(factbookRoot)) {
  execFileSync('git', ['clone', '--depth', '1', 'https://github.com/factbook/factbook.json.git', factbookRoot], { stdio: 'inherit' });
}

if (!fs.existsSync(dishesFile)) {
  const response = await fetch('https://raw.githubusercontent.com/samayo/country-json/master/src/country-by-national-dish.json');
  if (!response.ok) throw new Error(`Could not download national-dish data: ${response.status}`);
  fs.writeFileSync(dishesFile, await response.text());
}

const major = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'majorLanguageMetadata.json'), 'utf8'));
const mockSource = fs.readFileSync(path.join(root, 'src', 'data', 'mockLanguages.ts'), 'utf8');
const mockNames = [...mockSource.matchAll(/countryName:\s*'([^']+)'/g)].map((match) => match[1]);
const requestedNames = [...new Set(
  [...major.map((item) => item.geoAnchor.countryName), ...mockNames]
    .map((name) => name === 'Turkey' ? 'Türkiye' : name)
)]
  .sort((a, b) => a.localeCompare(b));

function walkJson(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkJson(target);
    return entry.isFile() && entry.name.endsWith('.json') ? [target] : [];
  });
}

const factbookByName = new Map();
for (const filename of walkJson(factbookRoot)) {
  if (filename.includes(`${path.sep}.git${path.sep}`) || filename.includes(`${path.sep}meta${path.sep}`)) continue;
  try {
    const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const countryName = data.Government?.['Country name']?.['conventional short form']?.text;
    if (countryName) factbookByName.set(countryName, { data, filename });
  } catch {
    // The archive includes a few metadata files that are not country profiles.
  }
}

const factbookAliases = {
  'Czechia': 'Czechia',
  'North Macedonia': 'North Macedonia',
  'Russia': 'Russia',
  'South Korea': 'Korea, South',
  'Türkiye': 'Turkey',
  'United Kingdom': 'United Kingdom',
  'Vietnam': 'Vietnam',
};

const dishes = new Map(JSON.parse(fs.readFileSync(dishesFile, 'utf8')).map((item) => [item.country, item.dish]));
const dishAliases = { 'South Korea': 'Korea, South', 'Türkiye': 'Turkey' };
const leftDrivingCountryCodes = new Set(['BD', 'GB', 'ID', 'IE', 'IN', 'JP', 'MY', 'NP', 'NZ', 'PK', 'TH', 'TZ', 'ZA', 'ZW']);

const populationResponse = await fetch('https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?date=2023:2026&format=json&per_page=2000');
if (!populationResponse.ok) throw new Error(`Could not download World Bank population data: ${populationResponse.status}`);
const populationPayload = await populationResponse.json();
const populationByCode = new Map();
for (const row of populationPayload[1] || []) {
  if (row.value != null && !populationByCode.has(row.countryiso3code)) populationByCode.set(row.countryiso3code, row);
}

const catalog = requestedNames.map((requestedName) => {
  const country = countries.find((item) =>
    item.name.common === requestedName ||
    item.name.official === requestedName ||
    item.altSpellings.includes(requestedName)
  );
  if (!country) throw new Error(`No world-countries match for ${requestedName}`);

  const factbookName = factbookAliases[requestedName] || requestedName;
  const factbook = factbookByName.get(factbookName)?.data;
  const factbookPath = factbookByName.get(factbookName)?.filename;
  const population = populationByCode.get(country.cca3);
  const currencyEntries = Object.entries(country.currencies || {}).map(([code, value]) => ({ code, name: value.name, symbol: value.symbol || null }));

  return {
    countryCode: country.cca2,
    countryName: requestedName,
    aliases: [...new Set([country.name.common, country.name.official, ...country.altSpellings])],
    capital: country.capital?.[0] || factbook?.Government?.Capital?.name?.text || null,
    currencies: currencyEntries,
    languages: Object.values(country.languages || {}),
    languageDetail: factbook?.['People and Society']?.Languages?.Languages?.text || factbook?.['People and Society']?.Languages?.text || null,
    population: population ? { value: population.value, year: Number(population.date) } : { value: country.population, year: null },
    religions: factbook?.['People and Society']?.Religions?.text || null,
    associatedDishes: [dishes.get(dishAliases[requestedName] || requestedName)].filter(Boolean),
    region: country.region,
    subregion: country.subregion,
    borders: (country.borders || []).map((code) => countries.find((item) => item.cca3 === code)?.name.common).filter(Boolean),
    areaKm2: country.area,
    landlocked: country.landlocked,
    drivingSide: leftDrivingCountryCodes.has(country.cca2) ? 'left' : 'right',
    callingCode: country.idd?.root ? `${country.idd.root}${country.idd.suffixes?.length === 1 ? country.idd.suffixes[0] : ''}` : null,
    topLevelDomains: country.tld || [],
    demonym: country.demonyms?.eng?.m || null,
    sources: {
      referenceData: 'https://github.com/mledoze/countries',
      population: 'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL',
      languageAndReligion: factbookPath ? 'https://github.com/factbook/factbook.json' : null,
      associatedDish: dishes.get(dishAliases[requestedName] || requestedName) ? 'https://github.com/samayo/country-json/blob/master/src/country-by-national-dish.json' : null,
    },
  };
});

fs.writeFileSync(outputFile, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Wrote ${catalog.length} country clue profiles to ${path.relative(root, outputFile)}`);
