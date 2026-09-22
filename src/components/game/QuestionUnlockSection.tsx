'use client';

import React, { useState } from 'react';
import { Lightbulb, Send, ShieldCheck, X } from 'lucide-react';
import { ClueQuestionResponse } from '@/types';

interface QuestionUnlockSectionProps {
  unlocked: boolean;
  onAskQuestion: (question: string) => Promise<ClueQuestionResponse>;
  onSkip?: () => void;
  isLoading?: boolean;
}

export const QuestionUnlockSection: React.FC<QuestionUnlockSectionProps> = ({
  unlocked,
  onAskQuestion,
  onSkip,
  isLoading = false,
}) => {
  const [inputQuestion, setInputQuestion] = useState('');
  const [feedback, setFeedback] = useState<ClueQuestionResponse | null>(null);

  if (!unlocked) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = inputQuestion.trim();
    if (!question || isLoading) return;
    const response = await onAskQuestion(question);
    setFeedback(response.category === 'SAFE_CLUE' ? null : response);
    if (response.category === 'SAFE_CLUE') setInputQuestion('');
  };

  return (
    <section className="relative my-4 w-full animate-in fade-in slide-in-from-bottom-2 overflow-hidden rounded-xl border-2 border-amber-400 bg-amber-50 p-4 shadow-[0_8px_30px_rgba(245,158,11,0.13)] dark:border-amber-500/70 dark:bg-amber-950/20">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-400 text-amber-950">
            <Lightbulb className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">
              Clue round · your guesses are paused
            </p>
            <h2 className="mt-0.5 text-lg font-black text-neutral-950 dark:text-white">Ask one clue question</h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
              This box asks for information. It will not submit a country guess.
            </p>
          </div>
        </div>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-amber-100 hover:text-neutral-950 dark:hover:bg-amber-900/40 dark:hover:text-white"
            aria-label="Close clue and keep guessing"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-stretch gap-2" aria-label="Ask for a clue">
        <label htmlFor="clue-question" className="sr-only">Your clue question</label>
        <input
          id="clue-question"
          type="text"
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          placeholder="Ask one question about the language"
          disabled={isLoading}
          className="h-[52px] min-w-0 flex-1 rounded-md border-2 border-amber-300 bg-white px-4 text-[15px] font-medium text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-amber-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-700 dark:bg-[#0b1016] dark:text-white dark:placeholder:text-neutral-600 dark:focus:border-amber-400"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!inputQuestion.trim() || isLoading}
          className="flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-md bg-amber-500 px-5 text-xs font-black uppercase tracking-[0.08em] text-amber-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-200 disabled:text-amber-500 dark:disabled:bg-amber-950 dark:disabled:text-amber-800"
        >
          <Send className="size-4" />
          <span className="hidden sm:inline">Ask</span>
        </button>
      </form>

      {feedback && (
        <div role="alert" className="mt-3 rounded-md border border-amber-300 bg-white/70 p-3 text-xs leading-relaxed text-neutral-700 dark:border-amber-800 dark:bg-black/20 dark:text-neutral-200">
          <p className="font-bold text-amber-800 dark:text-amber-300">That did not use your clue.</p>
          <p className="mt-1">{feedback.answer}</p>
          {feedback.suggestedTopics && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {feedback.suggestedTopics.slice(0, 3).map((topic) => (
                <button key={topic} type="button" onClick={() => { setInputQuestion(topic); setFeedback(null); }} className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
                  {topic}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-[10px] font-medium text-amber-800/80 dark:text-amber-300/80">
        <ShieldCheck className="size-3.5" /> Verified facts only. Blocked or unsupported questions do not use your clue.
      </p>
    </section>
  );
};
