'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface QuestionUnlockSectionProps {
  unlocked: boolean;
  onAskQuestion: (question: string) => Promise<void>;
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

  if (!unlocked) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = inputQuestion.trim();
    if (!question || isLoading) return;
    await onAskQuestion(question);
    setInputQuestion('');
  };

  return (
    <div className="relative my-4 w-full animate-in fade-in slide-in-from-bottom-2">
      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor="clue-question"
          className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400"
        >
          Your clue
        </label>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-[11px] font-bold text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
          >
            Keep guessing
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-stretch gap-2">
        <input
          id="clue-question"
          type="text"
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          placeholder="Ask one question about the language"
          disabled={isLoading}
          className="h-[52px] min-w-0 flex-1 rounded-md border-2 border-neutral-300 bg-white px-4 text-[15px] font-medium text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-[#0b1016] dark:text-white dark:placeholder:text-neutral-600 dark:focus:border-white"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!inputQuestion.trim() || isLoading}
          className="flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 text-xs font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600"
        >
          <Send className="size-4" />
          <span className="hidden sm:inline">Ask</span>
        </button>
      </form>

      <p className="mt-2 text-[10px] text-neutral-400 dark:text-neutral-500">
        One question available. Direct answer requests are blocked.
      </p>
    </div>
  );
};
