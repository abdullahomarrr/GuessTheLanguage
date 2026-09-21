import { STORAGE_KEYS } from '@/config';
import { AppFeedbackSurvey } from '@/types';

export type AppFeedbackSubmission = Omit<AppFeedbackSurvey, 'submittedAt'>;

export interface IAppFeedbackRepository {
  getFeedback(): Promise<AppFeedbackSurvey | null>;
  saveFeedback(feedback: AppFeedbackSubmission): Promise<AppFeedbackSurvey>;
}

export class LocalStorageAppFeedbackRepository implements IAppFeedbackRepository {
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  async getFeedback(): Promise<AppFeedbackSurvey | null> {
    if (!this.isBrowser()) return null;

    try {
      const saved = localStorage.getItem(STORAGE_KEYS.appFeedback);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  async saveFeedback(feedback: AppFeedbackSubmission): Promise<AppFeedbackSurvey> {
    const savedFeedback: AppFeedbackSurvey = {
      ...feedback,
      submittedAt: new Date().toISOString(),
    };

    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.appFeedback, JSON.stringify(savedFeedback));
    }

    return savedFeedback;
  }
}

export const appFeedbackRepository = new LocalStorageAppFeedbackRepository();
