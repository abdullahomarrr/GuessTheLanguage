'use client';

import React from 'react';
import { GAME_RULES } from '@/config';
import { GuessResult } from '@/types';

interface AttemptIndicatorsProps {
  guesses: GuessResult[];
  isGameComplete: boolean;
}

export const AttemptIndicators: React.FC<AttemptIndicatorsProps> = ({
  guesses,
  isGameComplete,
}) => {
  const total = GAME_RULES.maxGuesses;
  const currentAttemptIndex = guesses.length;

  return (
    <div className="my-2 select-none sm:my-3" aria-label="Guess attempts">
      <div className="mb-1.5 flex items-center justify-between sm:mb-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
          Attempts
        </span>
        <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
          {isGameComplete ? 'Complete' : `Guess ${Math.min(currentAttemptIndex + 1, total)} of ${total}`}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: total }).map((_, index) => {
          const guess = guesses[index];
          const isCurrent = index === currentAttemptIndex && !isGameComplete;

          let tileClass = 'border-neutral-300 bg-transparent text-neutral-400 dark:border-neutral-700 dark:text-neutral-600';

          if (guess) {
            if (guess.isCorrect) {
              tileClass = 'border-emerald-600 bg-emerald-600 text-white';
            } else if (guess.continentMatch) {
              tileClass = 'border-amber-500 bg-amber-500 text-white';
            } else {
              tileClass = 'border-neutral-500 bg-neutral-500 text-white dark:border-neutral-600 dark:bg-neutral-600';
            }
          } else if (isCurrent) {
            tileClass = 'border-neutral-900 bg-white text-neutral-950 shadow-[inset_0_0_0_1px_#171717] dark:border-white dark:bg-[#070b10] dark:text-white dark:shadow-[inset_0_0_0_1px_#fff]';
          }

          return (
            <div
              key={index}
              className={`grid h-8 place-items-center rounded-[3px] border-2 text-[11px] font-black transition-all duration-300 sm:h-11 sm:text-xs ${tileClass}`}
              title={`Attempt ${index + 1} of ${total}`}
            >
              {guess?.isCorrect ? '✓' : index + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
};
