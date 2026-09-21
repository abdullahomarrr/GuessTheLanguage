'use client';

import React, { useEffect, useState } from 'react';
import { Check, MessageCircle, Star } from 'lucide-react';
import { BRAND_CONFIG } from '@/config';
import { AppFeedbackArea, AppFeedbackSurvey as AppFeedbackSurveyData } from '@/types';
import { appFeedbackRepository } from '@/services/appFeedbackRepository';

interface AppFeedbackSurveyProps {
  challengeId: string;
}

const IMPROVEMENT_OPTIONS: Array<{ value: AppFeedbackArea; label: string }> = [
  { value: 'AUDIO', label: 'Audio' },
  { value: 'DIFFICULTY', label: 'Difficulty' },
  { value: 'MAP', label: 'Globe & map' },
  { value: 'CLUES', label: 'Clues' },
  { value: 'DESIGN', label: 'Design' },
  { value: 'PERFORMANCE', label: 'Speed' },
];

export const AppFeedbackSurvey: React.FC<AppFeedbackSurveyProps> = ({ challengeId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [puzzleFairness, setPuzzleFairness] = useState<AppFeedbackSurveyData['puzzleFairness'] | null>(null);
  const [returnIntent, setReturnIntent] = useState<AppFeedbackSurveyData['returnIntent'] | null>(null);
  const [improvementAreas, setImprovementAreas] = useState<AppFeedbackArea[]>([]);
  const [suggestion, setSuggestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let isActive = true;

    appFeedbackRepository.getFeedback().then((savedFeedback) => {
      if (!isActive || !savedFeedback) return;
      setOverallRating(savedFeedback.overallRating);
      setPuzzleFairness(savedFeedback.puzzleFairness);
      setReturnIntent(savedFeedback.returnIntent);
      setImprovementAreas(savedFeedback.improvementAreas);
      setSuggestion(savedFeedback.suggestion || '');
      setIsSubmitted(true);
    });

    return () => {
      isActive = false;
    };
  }, []);

  const toggleImprovementArea = (area: AppFeedbackArea) => {
    setImprovementAreas((current) =>
      current.includes(area) ? current.filter((item) => item !== area) : [...current, area]
    );
  };

  const canSubmit = overallRating > 0 && puzzleFairness !== null && returnIntent !== null;

  const submitFeedback = async () => {
    if (!canSubmit || !puzzleFairness || !returnIntent || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await appFeedbackRepository.saveFeedback({
        overallRating,
        puzzleFairness,
        returnIntent,
        improvementAreas,
        suggestion: suggestion.trim() || undefined,
        challengeId,
        appVersion: BRAND_CONFIG.version,
      });
      setIsSubmitted(true);
      setIsEditing(false);
      setIsExpanded(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted && !isEditing) {
    return (
      <section className="my-3 rounded-md border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-950/60">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-emerald-600 text-white">
            <Check className="size-3.5" />
          </span>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">Thanks for helping improve Lingo</p>
            <p className="text-[10px] text-neutral-400">Your product feedback has been saved.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
              setIsExpanded(true);
            }}
            className="text-[10px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Edit
          </button>
        </div>
      </section>
    );
  }

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="my-3 flex w-full items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 p-3.5 text-left transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950/60 dark:hover:border-neutral-600"
      >
        <span className="flex items-center gap-2.5">
          <MessageCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span>
            <span className="block text-[11px] font-bold text-neutral-800 dark:text-neutral-200">Rate Lingo</span>
            <span className="block text-[10px] text-neutral-400">Take a quick feedback survey</span>
          </span>
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-400">Start</span>
      </button>
    );
  }

  return (
    <section className="my-3 rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-neutral-900 dark:text-white">Help shape Lingo</h3>
          <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">A quick survey about the game itself.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsExpanded(false);
            setIsEditing(false);
          }}
          className="text-[10px] font-semibold text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          Close
        </button>
      </div>

      <fieldset className="mt-4">
        <legend className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400">
          Overall experience
        </legend>
        <div className="mt-2 flex gap-1.5" role="group" aria-label="Overall app rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setOverallRating(value)}
              aria-label={`${value} out of 5 stars`}
              aria-pressed={overallRating === value}
              className={`grid size-9 place-items-center rounded-[3px] border transition-colors ${
                overallRating >= value
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-neutral-300 text-neutral-400 hover:border-neutral-500 dark:border-neutral-700'
              }`}
            >
              <Star className="size-4" fill={overallRating >= value ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
      </fieldset>

      <ChoiceRow
        legend="Did today’s puzzle feel fair?"
        value={puzzleFairness}
        onChange={setPuzzleFairness}
        options={[
          ['FAIR', 'Yes'],
          ['MOSTLY_FAIR', 'Mostly'],
          ['UNFAIR', 'No'],
        ]}
      />

      <ChoiceRow
        legend="Would you play again tomorrow?"
        value={returnIntent}
        onChange={setReturnIntent}
        options={[
          ['YES', 'Definitely'],
          ['MAYBE', 'Maybe'],
          ['NO', 'Probably not'],
        ]}
      />

      <fieldset className="mt-4">
        <legend className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400">
          What could be better? <span className="font-normal normal-case tracking-normal text-neutral-400">Optional</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {IMPROVEMENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleImprovementArea(option.value)}
              aria-pressed={improvementAreas.includes(option.value)}
              className={`rounded-full border px-2.5 py-1.5 text-[10px] ${
                improvementAreas.includes(option.value)
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : 'border-neutral-300 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400">
        Suggestions <span className="font-normal normal-case tracking-normal text-neutral-400">Optional</span>
        <textarea
          value={suggestion}
          onChange={(event) => setSuggestion(event.target.value.slice(0, 500))}
          placeholder="What would make you come back every day?"
          rows={3}
          className="mt-2 w-full resize-none rounded-[3px] border border-neutral-300 bg-transparent px-3 py-2 text-[11px] font-normal normal-case tracking-normal text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-emerald-600 dark:border-neutral-700 dark:text-neutral-200"
        />
      </label>

      <button
        type="button"
        onClick={submitFeedback}
        disabled={!canSubmit || isSubmitting}
        className="mt-4 h-10 w-full rounded-md bg-emerald-600 text-[11px] font-black uppercase tracking-[0.08em] text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 dark:disabled:bg-neutral-800"
      >
        {isSubmitting ? 'Saving…' : isSubmitted ? 'Update feedback' : 'Submit feedback'}
      </button>
    </section>
  );
};

interface ChoiceRowProps<T extends string> {
  legend: string;
  value: T | null;
  onChange: (value: T) => void;
  options: ReadonlyArray<readonly [T, string]>;
}

function ChoiceRow<T extends string>({ legend, value, onChange, options }: ChoiceRowProps<T>) {
  return (
    <fieldset className="mt-4">
      <legend className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400">
        {legend}
      </legend>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {options.map(([optionValue, label]) => (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            aria-pressed={value === optionValue}
            className={`min-h-9 rounded-[3px] border px-1 text-[10px] font-semibold ${
              value === optionValue
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-neutral-300 text-neutral-500 dark:border-neutral-700 dark:text-neutral-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
