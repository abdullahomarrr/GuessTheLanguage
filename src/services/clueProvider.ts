import { Language, ClueQuestionResponse, ClueSafetyCategory } from '@/types';

export interface IClueProvider {
  answerQuestion(hiddenLanguage: Language, question: string): Promise<ClueQuestionResponse>;
}

export class MockClueProvider implements IClueProvider {
  private classifyQuestion(
    question: string,
    hiddenLanguage: Language
  ): { category: ClueSafetyCategory; topic?: string } {
    const q = question.toLowerCase().trim();

    // 1. Prompt Injection Checks
    const injectionTriggers = [
      'ignore previous',
      'ignore all instructions',
      'system prompt',
      'base64',
      'encoded',
      'developer mode',
      'jailbreak',
      'dan mode',
      'bypass',
      'print prompt',
    ];
    if (injectionTriggers.some((t) => q.includes(t))) {
      return { category: 'PROMPT_INJECTION' };
    }

    // 2. Direct Answer Leakage Checks
    const directTriggers = [
      'what language',
      'what country',
      'which country',
      'where is the speaker from',
      'where are they from',
      'tell me the answer',
      'what is the answer',
      'name of the language',
      'first letter',
      'last letter',
      'spell',
      'iso code',
      'iso 639',
      'glottocode',
      'backwards',
      'translate the name',
      'wikipedia page',
      'reveal the language',
      'reveal the country',
      'tell me the country',
      'give me the answer',
    ];
    if (directTriggers.some((t) => q.includes(t))) {
      return { category: 'TOO_REVEALING' };
    }

    // Checking if user directly asked "Is it [hidden language name or alias]?"
    const hiddenNames = [
      hiddenLanguage.name.toLowerCase(),
      hiddenLanguage.nativeName.toLowerCase(),
      ...hiddenLanguage.aliases.map((a) => a.toLowerCase()),
      ...(hiddenLanguage.geoAnchor.countryName
        ? [hiddenLanguage.geoAnchor.countryName.toLowerCase()]
        : []),
    ];
    for (const name of hiddenNames) {
      if (
        q.includes(`is it ${name}`) ||
        q.includes(`is the language ${name}`) ||
        q.includes(`is the answer ${name}`) ||
        q.includes(`are you speaking ${name}`) ||
        q === name
      ) {
        return { category: 'TOO_REVEALING' };
      }
    }

    // Check if user is testing other specific languages: "Is it French?" etc.
    // Asking whether it is a specific language directly is too revealing
    if (
      /^(is it|is the answer|is this)\s+[a-z]{3,15}\??$/i.test(q) &&
      !q.includes('tonal') &&
      !q.includes('european') &&
      !q.includes('asian') &&
      !q.includes('african') &&
      !q.includes('related')
    ) {
      return { category: 'TOO_REVEALING' };
    }

    // 3. Topic classification
    if (q.includes('food') || q.includes('dish') || q.includes('eat') || q.includes('cuisine') || q.includes('cook')) {
      return { category: 'SAFE_CLUE', topic: 'food' };
    }
    if (q.includes('song') || q.includes('music') || q.includes('instrument') || q.includes('sing') || q.includes('genre') || q.includes('drum')) {
      return { category: 'SAFE_CLUE', topic: 'music' };
    }
    if (q.includes('alphabet') || q.includes('script') || q.includes('writing') || q.includes('characters') || q.includes('letters') || q.includes('hangul') || q.includes('cyrillic') || q.includes('latin') || q.includes('devanagari')) {
      return { category: 'SAFE_CLUE', topic: 'script' };
    }
    if (q.includes('tone') || q.includes('tonal') || q.includes('pitch')) {
      return { category: 'SAFE_CLUE', topic: 'tonal' };
    }
    if (q.includes('related') || q.includes('family') || q.includes('branch') || q.includes('germanic') || q.includes('romance') || q.includes('slavic') || q.includes('celtic') || q.includes('semitic') || q.includes('sino')) {
      return { category: 'SAFE_CLUE', topic: 'family' };
    }
    if (q.includes('continent') || q.includes('europe') || q.includes('asia') || q.includes('africa') || q.includes('america') || q.includes('where is it spoken') || q.includes('region') || q.includes('country') || q.includes('countries') || q.includes('geography')) {
      return { category: 'SAFE_CLUE', topic: 'geography' };
    }
    if (q.includes('movie') || q.includes('film') || q.includes('book') || q.includes('author') || q.includes('literature') || q.includes('novel')) {
      return { category: 'SAFE_CLUE', topic: 'literature' };
    }
    if (q.includes('celebration') || q.includes('holiday') || q.includes('festival') || q.includes('tradition') || q.includes('culture')) {
      return { category: 'SAFE_CLUE', topic: 'celebration' };
    }
    if (q.includes('how many people') || q.includes('speaker') || q.includes('population') || q.includes('many speakers')) {
      return { category: 'SAFE_CLUE', topic: 'speakers' };
    }
    if (q.includes('how old') || q.includes('history') || q.includes('ancient') || q.includes('origin') || q.includes('century') || q.includes('older than')) {
      return { category: 'SAFE_CLUE', topic: 'history' };
    }
    if (q.includes('fact') || q.includes('unique') || q.includes('interesting') || q.includes('special')) {
      return { category: 'SAFE_CLUE', topic: 'fact' };
    }

    // Never guess what the player meant: an unclassified question cannot be
    // matched to a verified field and should remain retryable.
    return { category: 'UNRELATED' };
  }

  async answerQuestion(
    hiddenLanguage: Language,
    question: string
  ): Promise<ClueQuestionResponse> {
    const { category, topic } = this.classifyQuestion(question, hiddenLanguage);
    const profile = hiddenLanguage.clueProfile;

    if (category === 'PROMPT_INJECTION' || category === 'ABUSIVE') {
      return {
        category,
        answer:
          'Clues must stay focused on linguistic or cultural details that help you reason toward the country.',
        warning: 'Invalid inquiry',
        suggestedTopics: ['Food & Cuisine', 'Script / Alphabet', 'Musical Heritage', 'Language Family'],
      };
    }

    if (category === 'TOO_REVEALING') {
      return {
        category,
        answer:
          'That would reveal the country too directly. Try asking about the voice’s culture, history, writing system, music, food, or linguistic characteristics.',
        warning: 'Direct giveaway prevented',
        suggestedTopics: [
          'What alphabet or writing system does it use?',
          'What is a famous dish associated with this language?',
          'Is this language tonal?',
          'What language family does it belong to?',
        ],
      };
    }

    if (category === 'UNRELATED') {
      return {
        category,
        answer: 'I could not match that question to a verified clue fact. Try a specific question about writing, tone, language family, speakers, or geography.',
        warning: 'No verified answer available',
        suggestedTopics: this.getVerifiedQuestions(hiddenLanguage),
      };
    }

    // Safe Clue answers
    let answerText = '';

    switch (topic) {
      case 'food':
        answerText = profile.food || '';
        break;

      case 'music':
        answerText = profile.music || '';
        break;

      case 'script':
        answerText = profile.alphabetOrScript || (hiddenLanguage.scripts.length ? `This language is written in ${hiddenLanguage.scripts.join(' / ')}.` : '');
        break;

      case 'tonal':
        if (profile.tonal === true) {
          answerText = `Yes, this language is tonal. Pitch changes and inflections alter the meanings of words.`;
        } else if (profile.tonal === false) {
          answerText = `No, this language is not tonal. Word meanings do not change strictly based on pitch registers.`;
        }
        break;

      case 'family': {
        const hasReviewedFamily = hiddenLanguage.family && hiddenLanguage.family !== 'Catalogued language';
        if (hasReviewedFamily) {
          const branch = hiddenLanguage.branch && hiddenLanguage.branch !== 'Provider-reviewed variety' ? `, specifically the ${hiddenLanguage.branch} branch` : '';
          const related = profile.relatedLanguages?.length ? ` It is historically related to ${profile.relatedLanguages.join(', ')}.` : '';
          answerText = `This language belongs to the ${hiddenLanguage.family} language family${branch}.${related}`;
        }
        break;
      }

      case 'geography': {
        const continents = hiddenLanguage.continents.join(' and ');
        const regions = hiddenLanguage.primaryRegions.join(', ');
        answerText = `Geographically, this language is primarily rooted in ${continents}, particularly across ${regions}.`;
        break;
      }

      case 'literature':
        answerText = profile.famousMovieOrWork || '';
        break;

      case 'celebration':
        answerText = profile.culturalCelebration || '';
        break;

      case 'speakers':
        answerText = hiddenLanguage.estimatedSpeakers ? `It is spoken by approximately ${hiddenLanguage.estimatedSpeakers} worldwide.` : '';
        break;

      case 'history':
        answerText = profile.historicalEra || '';
        break;

      case 'fact':
        answerText = profile.interestingFact || '';
        break;

      default:
        answerText = '';
        break;
    }

    if (!answerText.trim()) {
      return {
        category: 'UNRELATED',
        answer: 'I do not have a reviewed fact for that topic, so I will not make one up. Choose one of the verified questions below instead.',
        warning: 'No verified answer available',
        suggestedTopics: this.getVerifiedQuestions(hiddenLanguage),
      };
    }

    return {
      category: 'SAFE_CLUE',
      answer: answerText,
    };
  }

  private getVerifiedQuestions(language: Language): string[] {
    const profile = language.clueProfile;
    const questions: string[] = [];
    if (profile.alphabetOrScript || language.scripts.length) questions.push('What writing system does it use?');
    if (profile.tonal !== undefined) questions.push('Is this language tonal?');
    if (language.family && language.family !== 'Catalogued language') questions.push('What language family does it belong to?');
    if (language.continents.length || language.primaryRegions.length) questions.push('What broad region is it associated with?');
    if (profile.food) questions.push('What food is associated with it?');
    if (profile.music) questions.push('What music is associated with it?');
    return questions.slice(0, 4);
  }
}

export const clueProvider = new MockClueProvider();
