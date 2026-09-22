import countryFactsJson from '@/data/countryClueFacts.json';
import { ClueQuestionResponse, ClueSafetyCategory, Language } from '@/types';

export type CountryClueTopic =
  | 'dish' | 'religion' | 'languages' | 'population' | 'currency' | 'capital'
  | 'region' | 'borders' | 'area' | 'landlocked' | 'driving_side' | 'calling_code'
  | 'domain' | 'demonym' | 'script' | 'tonal' | 'family';

interface CountryFactProfile {
  countryCode: string;
  countryName: string;
  aliases: string[];
  capital: string | null;
  currencies: Array<{ code: string; name: string; symbol: string | null }>;
  languages: string[];
  languageDetail: string | null;
  population: { value: number; year: number | null };
  religions: string | null;
  associatedDishes: string[];
  region: string;
  subregion: string;
  borders: string[];
  areaKm2: number;
  landlocked: boolean;
  drivingSide: string | null;
  callingCode: string | null;
  topLevelDomains: string[];
  demonym: string | null;
}

const countryFacts = countryFactsJson as CountryFactProfile[];

const TOPIC_PATTERNS: Array<[CountryClueTopic, RegExp[]]> = [
  ['dish', [/\b(national\s+)?dish(?:es)?\b/i, /\bfood\b/i, /\bcuisine\b/i, /\bmeal\b/i, /\bwhat\s+(?:do|would)\s+(?:they|people)\s+eat\b/i, /\bfamous\s+food\b/i]],
  ['religion', [/\breligio(?:n|ns|us)\b/i, /\bfaiths?\b/i, /\bworship\b/i, /\bwhat\s+do\s+they\s+believe\b/i, /\bbeliefs?\b/i]],
  ['languages', [/\blanguages?\s+(?:are\s+)?spoken\b/i, /\bofficial\s+languages?\b/i, /\bwhat\s+do\s+they\s+speak\b/i]],
  ['population', [/\bpopulation\b/i, /\bhow\s+many\s+(?:people|live)\b/i, /\bpeople\s+live\s+there\b/i, /\bpop\b/i]],
  ['currency', [/\bcurrenc(?:y|ies)\b/i, /\bwhat\s+money\b/i, /\bmoney\s+(?:do|does)\b/i, /\bpay\s+with\b/i]],
  ['capital', [/\bcapital(?:\s+city)?\b/i, /\bmain\s+city\b/i, /\bseat\s+of\s+government\b/i]],
  ['region', [/\bcontinent\b/i, /\bregion\b/i, /\bwhere\s+(?:is|in the world)\b/i, /\bpart\s+of\s+the\s+world\b/i, /\bgeograph/i]],
  ['borders', [/\bborders?\b/i, /\bneighbou?rs?\b/i, /\bnext\s+to\b/i, /\badjacent\b/i]],
  ['area', [/\barea\b/i, /\bhow\s+(?:big|large)\b/i, /\bsize\s+of\s+the\s+country\b/i]],
  ['landlocked', [/\blandlocked\b/i, /\bcoast(?:line|al)?\b/i, /\baccess\s+to\s+(?:the\s+)?sea\b/i, /\bocean\b/i]],
  ['driving_side', [/\bdrive\b/i, /\bdriving\s+side\b/i, /\bleft\s+side\b/i, /\bright\s+side\b/i]],
  ['calling_code', [/\bcalling\s+code\b/i, /\bphone\s+code\b/i, /\bdial(?:ing)?\s+code\b/i]],
  ['domain', [/\btop.level\s+domain\b/i, /\binternet\s+domain\b/i, /\bwebsite\s+ending\b/i, /\btld\b/i]],
  ['demonym', [/\bdemonym\b/i, /\bpeople\s+from\s+there\s+called\b/i, /\bwhat\s+are\s+the\s+people\s+called\b/i]],
  ['script', [/\bscript\b/i, /\balphabet\b/i, /\bwriting\s+system\b/i, /\bwritten\b/i, /\bletters\b/i]],
  ['tonal', [/\btonal\b/i, /\btone\s+language\b/i, /\bpitch\b/i]],
  ['family', [/\blanguage\s+family\b/i, /\blinguistic\s+family\b/i, /\brelated\s+languages?\b/i, /\bbranch\b/i]],
];

const INJECTION_PATTERNS = [/ignore\s+(?:all\s+)?(?:previous|above)/i, /system\s+prompt/i, /developer\s+(?:message|mode)/i, /jailbreak/i, /reveal\s+your\s+instructions/i, /print\s+(?:the\s+)?prompt/i];
const GIVEAWAY_PATTERNS = [/\bwhat\s+(?:is|country|language)\b.*\banswer\b/i, /\bwhat\s+country\b/i, /\bwhat\s+language\s+(?:is\s+it|is\s+this|are\s+they\s+speaking)\b/i, /\bwhich\s+(?:country|language)\b/i, /\bwhere\s+is\s+the\s+speaker\s+from\b/i, /\btell\s+me\s+the\s+answer\b/i, /\breveal\s+(?:the\s+)?(?:country|language|answer)\b/i, /\bfirst\s+letter\b/i, /\blast\s+letter\b/i, /\biso\s*(?:code|639)\b/i, /\bglottocode\b/i];

export function classifyDeterministically(question: string): { category: ClueSafetyCategory; topic?: CountryClueTopic } {
  const normalized = question.trim().replace(/\s+/g, ' ');
  if (!normalized) return { category: 'UNRELATED' };
  if (INJECTION_PATTERNS.some((pattern) => pattern.test(normalized))) return { category: 'PROMPT_INJECTION' };
  if (GIVEAWAY_PATTERNS.some((pattern) => pattern.test(normalized))) return { category: 'TOO_REVEALING' };

  const lower = normalized.toLowerCase().replace(/[?!.,]/g, '').trim();
  const asksIfSpecificPlace = /^(?:is\s+it|is\s+this|could\s+it\s+be|maybe|i\s+think)\s+/.test(lower);
  if (asksIfSpecificPlace && countryFacts.some((profile) => [profile.countryName, ...profile.aliases].some((name) => lower.includes(name.toLowerCase())))) return { category: 'TOO_REVEALING' };

  for (const [topic, patterns] of TOPIC_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(normalized))) return { category: 'SAFE_CLUE', topic };
  }
  return { category: 'UNRELATED' };
}

export function getSupportedTopics(): CountryClueTopic[] {
  return TOPIC_PATTERNS.map(([topic]) => topic);
}

export function answerCountryClue(language: Language, topic: CountryClueTopic, source: 'DETERMINISTIC' | 'GEMINI_ROUTED' = 'DETERMINISTIC'): ClueQuestionResponse {
  const targetName = language.geoAnchor.countryName === 'Turkey' ? 'Türkiye' : language.geoAnchor.countryName;
  const facts = countryFacts.find((profile) => profile.countryName === targetName || profile.countryCode === language.geoAnchor.countryCode);
  if (!facts) return unsupported();

  let answer = '';
  switch (topic) {
    case 'dish': if (facts.associatedDishes.length) answer = `A dish strongly associated with this country is ${joinList(facts.associatedDishes)}.`; break;
    case 'religion': if (facts.religions) answer = `Its religious landscape is: ${facts.religions}`; break;
    case 'languages': answer = facts.languageDetail || (facts.languages.length ? `Languages used there include ${joinList(facts.languages)}.` : ''); break;
    case 'population': if (facts.population.value) answer = `Its population is about ${formatPopulation(facts.population.value)}${facts.population.year ? ` (${facts.population.year})` : ''}.`; break;
    case 'currency': if (facts.currencies.length) answer = `The currency used is ${joinList(facts.currencies.map((currency) => `${currency.name} (${currency.code})`))}.`; break;
    case 'capital': if (facts.capital) answer = `Its capital is ${facts.capital}.`; break;
    case 'region': answer = `It is in ${facts.subregion || facts.region}, within ${facts.region}.`; break;
    case 'borders': answer = facts.borders.length ? `It shares land borders with ${joinList(facts.borders)}.` : 'It has no land borders.'; break;
    case 'area': answer = `It covers about ${Math.round(facts.areaKm2).toLocaleString('en-US')} square kilometres.`; break;
    case 'landlocked': answer = facts.landlocked ? 'It is landlocked.' : 'It is not landlocked and has access to the sea or ocean.'; break;
    case 'driving_side': if (facts.drivingSide) answer = `Traffic drives on the ${facts.drivingSide} side of the road.`; break;
    case 'calling_code': if (facts.callingCode) answer = `Its international calling code is ${facts.callingCode}.`; break;
    case 'domain': if (facts.topLevelDomains.length) answer = `Its country-code internet domain is ${joinList(facts.topLevelDomains)}.`; break;
    case 'demonym': if (facts.demonym) answer = `A person from there may be described as ${facts.demonym}.`; break;
    case 'script': answer = language.clueProfile.alphabetOrScript || (language.scripts.length ? `The language is written using ${joinList(language.scripts)}.` : ''); break;
    case 'tonal':
      if (language.clueProfile.tonal === true) answer = 'Yes. This is a tonal language, so pitch can distinguish word meanings.';
      if (language.clueProfile.tonal === false) answer = 'No. It is not generally classified as a tonal language.';
      break;
    case 'family': {
      const reviewedFamily = language.family && language.family !== 'Catalogued language';
      if (reviewedFamily) answer = `It belongs to the ${language.family} language family${language.branch && language.branch !== 'Provider-reviewed variety' ? `, in the ${language.branch} branch` : ''}.`;
      break;
    }
  }

  if (!answer) return unsupported();
  return { category: 'SAFE_CLUE', answer, topic, source };
}

export function safetyResponse(category: ClueSafetyCategory): ClueQuestionResponse {
  if (category === 'TOO_REVEALING') return { category, answer: 'That would give away the answer too directly. Ask about a characteristic of the country or language instead.', warning: 'Direct giveaway prevented', suggestedTopics: suggestions() };
  if (category === 'PROMPT_INJECTION' || category === 'ABUSIVE') return { category, answer: 'That question cannot be used for a clue. Ask about the country or language instead.', warning: 'Invalid clue question', suggestedTopics: suggestions() };
  return unsupported();
}

function unsupported(): ClueQuestionResponse {
  return { category: 'UNRELATED', answer: 'I could not match that to a reviewed fact. Try one of these questions instead.', warning: 'No verified answer available', suggestedTopics: suggestions() };
}

function suggestions(): string[] {
  return ['What is a national dish?', 'What currency do they use?', 'What is the religious landscape?', 'How many people live there?'];
}

function joinList(items: string[]): string {
  if (items.length < 2) return items[0] || '';
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

function formatPopulation(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2).replace(/\.00$/, '')} billion people`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')} million people`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} thousand people`;
  return `${value.toLocaleString('en-US')} people`;
}
