import { ClueQuestionResponse } from '@/types';

export interface IClueProvider {
  answerQuestion(challengeId: string, question: string): Promise<ClueQuestionResponse>;
}

export class HttpClueProvider implements IClueProvider {
  async answerQuestion(challengeId: string, question: string): Promise<ClueQuestionResponse> {
    try {
      const response = await fetch('/api/clues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, question }),
      });
      const payload = await response.json() as ClueQuestionResponse | { error?: string };
      if (!response.ok || !('category' in payload)) throw new Error('Clue request failed');
      return payload;
    } catch {
      return {
        category: 'UNRELATED',
        answer: 'The clue service could not be reached. Your clue has not been used.',
        warning: 'Clue service unavailable',
      };
    }
  }
}

export const clueProvider = new HttpClueProvider();
