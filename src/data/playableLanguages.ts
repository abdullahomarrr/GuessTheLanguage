import { Language } from '@/types';
import { MOCK_LANGUAGES } from '@/data/mockLanguages';
import majorLanguageMetadata from '@/data/majorLanguageMetadata.json';

export const MAJOR_LANGUAGES = majorLanguageMetadata as unknown as Language[];

/** All language records that have a stored, owner-approved daily recording. */
export const PLAYABLE_LANGUAGES: Language[] = [
  ...MOCK_LANGUAGES,
  ...MAJOR_LANGUAGES,
];
