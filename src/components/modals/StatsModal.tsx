'use client';

import React from 'react';
import { X } from 'lucide-react';
import { PlayerStats } from '@/types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  const winPercentage =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  const maxDistributionCount = Math.max(
    1,
    ...Object.values(stats.guessDistribution)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-neutral-300 bg-white p-5 shadow-2xl transition-all dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="mb-5 text-center font-sans text-xl font-black tracking-[-0.03em] text-neutral-950 dark:text-white">
          Player Statistics
        </h3>

        {/* 4 Summary Metric Cards */}
        <div className="my-3 grid grid-cols-4 divide-x divide-neutral-200 text-center dark:divide-neutral-800">
          <div className="px-1 py-2.5">
            <span className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 block">
              {stats.gamesPlayed}
            </span>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Played</span>
          </div>

          <div className="px-1 py-2.5">
            <span className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 block">
              {winPercentage}%
            </span>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Win Rate</span>
          </div>

          <div className="px-1 py-2.5">
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
              {stats.currentStreak}
            </span>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Streak</span>
          </div>

          <div className="px-1 py-2.5">
            <span className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 block">
              {stats.maxStreak}
            </span>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Max</span>
          </div>
        </div>

        {/* Guess Distribution Histogram */}
        <div className="my-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2.5">
            Guess Distribution
          </h4>

          <div className="flex flex-col gap-1.5 font-mono text-xs">
            {([1, 2, 3, 4, 5] as const).map((guessNum) => {
              const count = stats.guessDistribution[guessNum] || 0;
              const barWidthPercent = Math.max(7, Math.round((count / maxDistributionCount) * 100));

              return (
                <div key={guessNum} className="flex items-center gap-2">
                  <span className="w-3 text-neutral-400 font-medium text-right">{guessNum}</span>
                  <div className="h-6 flex-1 overflow-hidden bg-neutral-100 dark:bg-neutral-800/50">
                    <div
                      style={{ width: `${barWidthPercent}%` }}
                      className={`flex h-full items-center justify-end px-2 text-[11px] font-bold text-white transition-all duration-500 ${
                        count > 0 ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500'
                      }`}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clue Insights */}
        <div className="flex items-center justify-between border-y border-neutral-200 py-3 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
          <span>Solved without AI clue:</span>
          <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">
            {stats.gamesWon > 0
              ? `${Math.round((stats.gamesSolvedWithoutAI / stats.gamesWon) * 100)}%`
              : '0%'}
          </span>
        </div>

        {/* Recent Game History if any */}
        {stats.history && stats.history.length > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Recent Challenges
            </h4>
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
              {stats.history.slice(0, 5).map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-800/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-neutral-400">
                      #{entry.challengeNumber}
                    </span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {entry.languageName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.usedAI && (
                      <span className="text-[10px] bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.2 rounded text-neutral-500">
                        AI clue
                      </span>
                    )}
                    <span
                      className={`font-semibold font-mono ${
                        entry.won
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-neutral-400'
                      }`}
                    >
                      {entry.won ? `${entry.guessesCount}/5` : 'X/5'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
