import { STORAGE_KEYS } from '@/config';
import { AudioCommunityReview } from '@/types';
import { trackAnalyticsEvent } from '@/services/analyticsClient';

export type AudioReviewSubmission = Omit<
  AudioCommunityReview,
  'submittedAt' | 'submissionStatus'
>;

export interface IAudioReviewRepository {
  getReview(challengeId: string): Promise<AudioCommunityReview | null>;
  saveReview(review: AudioReviewSubmission): Promise<AudioCommunityReview>;
}

export class LocalStorageAudioReviewRepository implements IAudioReviewRepository {
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  async getReview(challengeId: string): Promise<AudioCommunityReview | null> {
    if (!this.isBrowser()) return null;

    try {
      const saved = localStorage.getItem(`${STORAGE_KEYS.audioReviewPrefix}${challengeId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  async saveReview(review: AudioReviewSubmission): Promise<AudioCommunityReview> {
    const savedReview: AudioCommunityReview = {
      ...review,
      submittedAt: new Date().toISOString(),
      submissionStatus: 'PENDING',
    };

    if (this.isBrowser()) {
      localStorage.setItem(
        `${STORAGE_KEYS.audioReviewPrefix}${review.challengeId}`,
        JSON.stringify(savedReview)
      );
      trackAnalyticsEvent('audio_review', {
        challengeId: review.challengeId,
        audioClipId: review.audioClipId,
        languageId: review.languageId,
        review: savedReview,
      });
    }

    return savedReview;
  }
}

export const audioReviewRepository = new LocalStorageAudioReviewRepository();
