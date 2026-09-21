'use client';

import React, { Fragment } from 'react';
import { Check, X, Flame, Thermometer, Snowflake } from 'lucide-react';
import { ClueQuestionResponse, GuessResult } from '@/types';

interface GuessHistoryProps {
  guesses: GuessResult[];
  questionAsked?: {
    question: string;
    response: ClueQuestionResponse;
  };
}

export const GuessHistory: React.FC<GuessHistoryProps> = ({ guesses, questionAsked }) => {
  if (guesses.length === 0) return null;

  return (
    <div className="my-5 flex w-full flex-col gap-2 border-t border-neutral-200 pt-4 transition-all dark:border-neutral-800">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
        Your guesses
      </div>

      <div className="flex flex-col divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {guesses.map((guess, index) => {
          const isLatest = index === guesses.length - 1;
          const attemptStr = String(guess.attemptNumber).padStart(2, '0');

          return (
            <Fragment key={`${guess.guessedLanguageId}_${guess.attemptNumber}`}>
            <div
              className={`flex min-h-14 items-center justify-between gap-3 py-2.5 transition-all duration-300 ${
                isLatest
                  ? 'opacity-100'
                  : 'opacity-70'
              }`}
            >
              {/* Left: Attempt # & Country Name */}
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-[3px] bg-neutral-200 font-mono text-xs font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {attemptStr}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold text-neutral-950 dark:text-white">
                    {guess.guessedCountryName || guess.geoAnchor.countryName || guess.guessedLanguageName}
                  </span>
                  {guess.isCorrect ? (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-500 text-[10px]">
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Deductions (Continent + Proximity) */}
              <div className="flex items-center gap-2 text-xs">
                {/* Continent Match Feedback */}
                {guess.isCorrect ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px] bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    Country found!
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {guess.continentMatch ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                        ✓ Correct continent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-neutral-400 dark:text-neutral-500 text-[11px] bg-neutral-100 dark:bg-neutral-800/60 px-2 py-0.5 rounded-md">
                        Different continent
                      </span>
                    )}

                    {/* Proximity Band (revealed on guesses 3 and 4) */}
                    {guess.proximityBand && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-400">
                        {guess.proximityBand === 'HOT' && (
                          <>
                            <Flame className="w-3 h-3 fill-current" />
                            <span>HOT</span>
                          </>
                        )}
                        {guess.proximityBand === 'WARM' && (
                          <>
                            <Thermometer className="w-3 h-3" />
                            <span>WARM</span>
                          </>
                        )}
                        {guess.proximityBand === 'COLD' && (
                          <>
                            <Snowflake className="w-3 h-3" />
                            <span>COLD</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {questionAsked && index === 1 && (
              <div className="flex items-start gap-3 bg-emerald-50/60 py-3 dark:bg-emerald-950/15">
                <span className="ml-1 grid size-8 shrink-0 place-items-center rounded-[3px] bg-emerald-600 text-sm font-black text-white">
                  ?
                </span>
                <div className="min-w-0 pr-3">
                  <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">
                    Your clue
                  </span>
                  <p className="mt-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    “{questionAsked.question}”
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                    {questionAsked.response.answer}
                  </p>
                </div>
              </div>
            )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};
