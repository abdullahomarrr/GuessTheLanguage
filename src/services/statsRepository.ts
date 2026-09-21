import { PlayerStats, DailyGameState } from '@/types';
import { STORAGE_KEYS } from '@/config';

export interface IStatsRepository {
  getStats(): Promise<PlayerStats>;
  recordGameCompletion(gameState: DailyGameState, targetLanguageName: string): Promise<PlayerStats>;
  getGameState(dateStr: string): Promise<DailyGameState | null>;
  saveGameState(gameState: DailyGameState): Promise<void>;
}

const DEFAULT_STATS: PlayerStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  },
  totalQuestionsUsed: 0,
  gamesSolvedWithoutAI: 0,
  history: [],
};

export class LocalStorageStatsRepository implements IStatsRepository {
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  async getStats(): Promise<PlayerStats> {
    if (!this.isBrowser()) {
      return DEFAULT_STATS;
    }

    try {
      const data = localStorage.getItem(STORAGE_KEYS.playerStats);
      if (!data) return DEFAULT_STATS;
      return { ...DEFAULT_STATS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_STATS;
    }
  }

  async recordGameCompletion(
    gameState: DailyGameState,
    targetLanguageName: string
  ): Promise<PlayerStats> {
    const stats = await this.getStats();

    // Check if this date was already recorded in history
    const existingIndex = stats.history.findIndex((h) => h.date === gameState.date);
    if (existingIndex >= 0) {
      return stats; // Already recorded
    }

    const won = gameState.status === 'WON';
    const guessesCount = gameState.guesses.length;
    const usedAI = !!gameState.questionAsked;

    stats.gamesPlayed += 1;
    if (won) {
      stats.gamesWon += 1;
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.maxStreak) {
        stats.maxStreak = stats.currentStreak;
      }
      if (guessesCount >= 1 && guessesCount <= 5) {
        const guessKey = guessesCount as 1 | 2 | 3 | 4 | 5;
        stats.guessDistribution[guessKey] = (stats.guessDistribution[guessKey] || 0) + 1;
      }
      if (!usedAI) {
        stats.gamesSolvedWithoutAI += 1;
      }
    } else {
      stats.currentStreak = 0;
    }

    if (usedAI) {
      stats.totalQuestionsUsed += 1;
    }

    stats.lastPlayedDate = gameState.date;
    stats.history.unshift({
      date: gameState.date,
      challengeNumber: gameState.challengeNumber,
      won,
      guessesCount,
      usedAI,
      languageName: targetLanguageName,
    });

    if (this.isBrowser()) {
      try {
        localStorage.setItem(STORAGE_KEYS.playerStats, JSON.stringify(stats));
      } catch (err) {
        console.error('Failed to save stats to localStorage', err);
      }
    }

    return stats;
  }

  async getGameState(dateStr: string): Promise<DailyGameState | null> {
    if (!this.isBrowser()) return null;
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.gameStatePrefix}${dateStr}`);
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async saveGameState(gameState: DailyGameState): Promise<void> {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(
        `${STORAGE_KEYS.gameStatePrefix}${gameState.date}`,
        JSON.stringify(gameState)
      );
    } catch (err) {
      console.error('Failed to save game state to localStorage', err);
    }
  }
}

export const statsRepository = new LocalStorageStatsRepository();
