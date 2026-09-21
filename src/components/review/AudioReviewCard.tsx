'use client';

import React, { useEffect, useState } from 'react';
import { Check, Flag, MessageSquareText } from 'lucide-react';
import {
  AudioCommunityReview,
  AudioReviewIssue,
  AudioReviewProficiency,
} from '@/types';
import { audioReviewRepository } from '@/services/audioReviewRepository';

interface AudioReviewCardProps {
  challengeId: string;
  audioClipId: string;
  languageId: string;
  languageName: string;
}

type RatingKey = keyof AudioCommunityReview['ratings'];

const RATING_ROWS: Array<{ key: RatingKey; label: string; description: string }> = [
  { key: 'pronunciation', label: 'Pronunciation', description: 'Clear and accurate words' },
  { key: 'fluency', label: 'Fluency', description: 'Smooth, natural pacing' },
  { key: 'audioQuality', label: 'Audio quality', description: 'Clean and easy to hear' },
  { key: 'naturalness', label: 'Naturalness', description: 'Sounds like real everyday speech' },
];

const PROFICIENCY_OPTIONS: Array<{ value: AudioReviewProficiency; label: string }> = [
  { value: 'NATIVE', label: 'Native' },
  { value: 'FLUENT', label: 'Fluent' },
  { value: 'LEARNING', label: 'Learning' },
  { value: 'NOT_SPEAKER', label: 'I don’t speak it' },
];

const ISSUE_OPTIONS: Array<{ value: AudioReviewIssue; label: string }> = [
  { value: 'WRONG_LANGUAGE_OR_DIALECT', label: 'Wrong language or dialect' },
  { value: 'TRANSCRIPT_OR_TRANSLATION', label: 'Transcript or translation issue' },
  { value: 'BACKGROUND_NOISE', label: 'Background noise' },
  { value: 'SYNTHETIC_OR_EDITED', label: 'Sounds synthetic or heavily edited' },
  { value: 'CONTAINS_GIVEAWAY', label: 'Audio gives away the answer' },
];

const EMPTY_RATINGS: AudioCommunityReview['ratings'] = {
  pronunciation: 0,
  fluency: 0,
  audioQuality: 0,
  naturalness: 0,
};

export const AudioReviewCard: React.FC<AudioReviewCardProps> = ({
  challengeId,
  audioClipId,
  languageId,
  languageName,
}) => {
  const [languageProficiency, setLanguageProficiency] = useState<AudioReviewProficiency | null>(null);
  const [ratings, setRatings] = useState<AudioCommunityReview['ratings']>(EMPTY_RATINGS);
  const [issues, setIssues] = useState<AudioReviewIssue[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let isActive = true;

    audioReviewRepository.getReview(challengeId).then((savedReview) => {
      if (!isActive || !savedReview) return;
      setLanguageProficiency(savedReview.languageProficiency);
      setRatings(savedReview.ratings);
      setIssues(savedReview.issues);
      setNotes(savedReview.notes || '');
      setIsSubmitted(true);
    });

    return () => {
      isActive = false;
    };
  }, [challengeId]);

  const isComplete =
    languageProficiency !== null && Object.values(ratings).every((rating) => rating > 0);

  const toggleIssue = (issue: AudioReviewIssue) => {
    setIssues((current) =>
      current.includes(issue) ? current.filter((item) => item !== issue) : [...current, issue]
    );
  };

  const submitReview = async () => {
    if (!languageProficiency || !isComplete || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await audioReviewRepository.saveReview({
        challengeId,
        audioClipId,
        languageId,
        languageProficiency,
        ratings,
        issues,
        notes: notes.trim() || undefined,
      });
      setIsSubmitted(true);
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted && !isEditing) {
    return (
      <section className="my-3 rounded-md border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
            <Check className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-white">Audio review saved</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              Your feedback joins the moderation queue. Community ratings never approve a recording automatically.
            </p>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="mt-2 text-[11px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Edit review
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="my-3 rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/60">
      <div className="flex items-start gap-2.5">
        <MessageSquareText className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div>
          <h3 className="text-xs font-bold text-neutral-900 dark:text-white">Rate today’s voice</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            Help us catch weak recordings before they stay in rotation.
          </p>
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400">
          Do you speak {languageName}?
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {PROFICIENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setLanguageProficiency(option.value)}
              aria-pressed={languageProficiency === option.value}
              className={`min-h-9 rounded-[3px] border px-2 text-[10px] font-semibold transition-colors ${
                languageProficiency === option.value
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-neutral-300 text-neutral-600 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {RATING_ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">{row.label}</p>
              <p className="text-[10px] text-neutral-400">{row.description}</p>
            </div>
            <div className="flex shrink-0 gap-1" role="group" aria-label={`${row.label} rating`}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRatings((current) => ({ ...current, [row.key]: value }))}
                  aria-label={`${row.label}: ${value} out of 5`}
                  aria-pressed={ratings[row.key] === value}
                  className={`grid size-7 place-items-center rounded-[3px] border text-[10px] font-bold transition-colors ${
                    ratings[row.key] >= value
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-neutral-300 text-neutral-400 hover:border-neutral-500 dark:border-neutral-700'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <details className="mt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
          <Flag className="size-3.5" /> Report an issue
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ISSUE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleIssue(option.value)}
              aria-pressed={issues.includes(option.value)}
              className={`rounded-full border px-2.5 py-1.5 text-[10px] transition-colors ${
                issues.includes(option.value)
                  ? 'border-rose-500 bg-rose-500 text-white'
                  : 'border-neutral-300 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value.slice(0, 240))}
          placeholder="Optional details for the review team"
          rows={2}
          className="mt-2 w-full resize-none rounded-[3px] border border-neutral-300 bg-transparent px-3 py-2 text-[11px] text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-emerald-600 dark:border-neutral-700 dark:text-neutral-200"
        />
      </details>

      <button
        type="button"
        onClick={submitReview}
        disabled={!isComplete || isSubmitting}
        className="mt-4 h-10 w-full rounded-md bg-emerald-600 text-[11px] font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 dark:disabled:bg-neutral-800"
      >
        {isSubmitting ? 'Saving…' : isSubmitted ? 'Update review' : 'Submit review'}
      </button>
    </section>
  );
};
