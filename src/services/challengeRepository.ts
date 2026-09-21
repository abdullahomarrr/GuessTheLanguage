import { DailyChallenge } from '@/types';
import { getChallengeForDate } from '@/data/mockChallenges';

export interface IChallengeRepository {
  getDailyChallenge(dateStr?: string): Promise<DailyChallenge>;
  getChallengeById(id: string): Promise<DailyChallenge | null>;
}

export class MockChallengeRepository implements IChallengeRepository {
  private getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async getDailyChallenge(dateStr?: string): Promise<DailyChallenge> {
    const targetDate = dateStr || this.getTodayDateString();
    return getChallengeForDate(targetDate);
  }

  async getChallengeById(id: string): Promise<DailyChallenge | null> {
    // Extract date from challenge_YYYY-MM-DD
    const match = id.match(/challenge_(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return getChallengeForDate(match[1]);
    }
    return getChallengeForDate(this.getTodayDateString());
  }
}

export const challengeRepository = new MockChallengeRepository();
