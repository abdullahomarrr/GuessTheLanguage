'use client';

import React from 'react';
import { X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const rules = [
  {
    number: '1',
    title: 'Listen to the voice',
    description: 'Play the daily audio clue and pay attention to its rhythm, sounds, and cadence.',
  },
  {
    number: '2',
    title: 'Guess the country',
    description: 'Choose where you think the speaker is from. You have five guesses.',
  },
  {
    number: '3',
    title: 'Use the feedback',
    description: 'Geographic hints get stronger as you play. One strategic clue unlocks after two misses.',
  },
];

const feedback = [
  { label: 'Correct', className: 'border-emerald-600 bg-emerald-600 text-white' },
  { label: 'Hot', className: 'border-rose-500 bg-rose-500 text-white' },
  { label: 'Warm', className: 'border-amber-500 bg-amber-500 text-white' },
  { label: 'Cold', className: 'border-sky-600 bg-sky-600 text-white' },
];

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/75 p-3 backdrop-blur-sm animate-in fade-in duration-150 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-play-title"
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-md border border-neutral-300 bg-white px-5 pb-5 pt-6 shadow-2xl dark:border-neutral-700 dark:bg-[#111418] sm:px-7 sm:pb-7"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:hover:bg-neutral-800 dark:hover:text-white"
          aria-label="Close modal"
        >
          <X className="size-5" />
        </button>

        <header className="border-b border-neutral-200 pb-5 pr-9 dark:border-neutral-800">
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
            Daily audio geography game
          </p>
          <h2
            id="how-to-play-title"
            className="text-2xl font-black tracking-[-0.04em] text-neutral-950 dark:text-white"
          >
            How to play
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            Identify the country represented by today’s mystery voice in five guesses.
          </p>
        </header>

        <ol className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {rules.map((rule) => (
            <li key={rule.number} className="flex gap-3.5 py-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-[3px] border-2 border-neutral-900 text-sm font-black text-neutral-950 dark:border-white dark:text-white">
                {rule.number}
              </span>
              <div className="pt-0.5">
                <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                  {rule.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {rule.description}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <section className="border-t border-neutral-200 pt-4 dark:border-neutral-800" aria-labelledby="feedback-title">
          <h3 id="feedback-title" className="text-[11px] font-black uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
            Feedback
          </h3>
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {feedback.map((item) => (
              <div
                key={item.label}
                className={`grid h-10 place-items-center rounded-[3px] border-2 text-[10px] font-black uppercase tracking-wide ${item.className}`}
              >
                {item.label}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            Everyone gets the same puzzle. A new mystery voice arrives every day.
          </p>
        </section>

        <button
          onClick={onClose}
          className="mt-5 h-12 w-full rounded-md bg-emerald-600 text-xs font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-emerald-700 active:translate-y-px"
        >
          Play today’s puzzle
        </button>
      </div>
    </div>
  );
};
