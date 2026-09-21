'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Check,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Language, AudioClip, DailyGameState } from '@/types';
import { BRAND_CONFIG } from '@/config';
import { audioPlayerService } from '@/services/audioPlayerService';
import { AudioReviewCard } from '@/components/review/AudioReviewCard';
import { AppFeedbackSurvey } from '@/components/review/AppFeedbackSurvey';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  clip: AudioClip | null;
  gameState: DailyGameState;
  currentStreak: number;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  onClose,
  language,
  clip,
  gameState,
  currentStreak,
}) => {
  const [copied, setCopied] = useState(false);
  const [timeUntilNext, setTimeUntilNext] = useState('');

  const isWon = gameState.status === 'WON';
  const attemptsUsed = gameState.guesses.length;

  // Trigger restrained celebration confetti on win
  useEffect(() => {
    if (isOpen && isWon) {
      try {
        confetti({
          particleCount: 40,
          spread: 55,
          origin: { y: 0.65 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
          disableForReducedMotion: true,
        });
      } catch {}
    }
  }, [isOpen, isWon]);

  // Countdown timer to next day's challenge
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diffMs = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeUntilNext(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  // Generate spoiler-free share text
  const generateShareText = () => {
    const header = `${BRAND_CONFIG.name} #${gameState.challengeNumber}`;
    const scoreLine = isWon ? `${attemptsUsed}/5` : 'X/5';

    const journeyLines: string[] = gameState.guesses.map((g) => {
      if (g.isCorrect) {
        return '✅ Found it!';
      }
      if (g.proximityBand === 'HOT') {
        return '🔥 HOT';
      }
      if (g.proximityBand === 'WARM') {
        return '🌡️ WARM';
      }
      if (g.proximityBand === 'COLD') {
        return '🧊 COLD';
      }
      if (g.continentMatch) {
        return '🌍 Correct Continent';
      }
      return '🎧 Guessed';
    });

    if (gameState.questionAsked) {
      journeyLines.splice(2, 0, '💬 Asked 1 clue');
    }

    const streakLine = currentStreak > 0 ? `\n🔥 ${currentStreak}-day streak` : '';

    return `${header} · ${scoreLine}\n\n${journeyLines.join('\n')}${streakLine}\n\nPlay at: ${window.location.origin}`;
  };

  const handleShare = async () => {
    const shareText = generateShareText();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const handleReplayAudio = () => {
    audioPlayerService.seek(0);
    audioPlayerService.play();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-3 backdrop-blur-sm animate-in fade-in duration-200 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-xl border border-neutral-300 bg-white shadow-2xl transition-all dark:border-neutral-700 dark:bg-[#141414]"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Status banner */}
        <header className="px-5 pb-4 pt-7 text-center sm:px-6">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-[3px] bg-neutral-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {isWon ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Solved in {attemptsUsed}/5
              </span>
            ) : (
              <span className="text-neutral-500">The speaker was from</span>
            )}
          </div>

          <h2 id="result-title" className="font-sans text-[32px] font-black leading-none tracking-[-0.045em] text-neutral-950 dark:text-white sm:text-4xl">
            {language.geoAnchor.countryName || language.name}
          </h2>
          <p className="mt-1.5 font-sans text-sm text-neutral-500 dark:text-neutral-400">
            {language.name} · {language.nativeName}
          </p>
        </header>

        {/* Audio Transcript Card */}
        {clip && (
          <section className="mx-5 rounded-md border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-950/70 sm:mx-6">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <Volume2 className="w-4 h-4 text-emerald-600" />
                <span>What You Heard</span>
              </div>
              <button
                onClick={handleReplayAudio}
                className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-[11px] font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              >
                <RotateCcw className="w-3 h-3" /> Replay
              </button>
            </div>

            <p className="mb-1.5 font-sans text-sm font-semibold leading-relaxed text-neutral-900 dark:text-neutral-100" dir="auto">
              “{clip.transcriptOriginal}”
            </p>
            <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              <span className="font-semibold text-neutral-600 dark:text-neutral-300">English:</span>{' '}
              “{clip.translationEnglish}”
            </p>
            <p className="mt-2 text-[10px] leading-relaxed text-neutral-400 dark:text-neutral-500">
              Recording:{' '}
              {clip.attributionUrl || clip.sourceUrl ? (
                <a
                  href={clip.attributionUrl || clip.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-neutral-300 underline-offset-2 hover:text-neutral-600 dark:decoration-neutral-700 dark:hover:text-neutral-300"
                >
                  {clip.creator || clip.sourceName}
                </a>
              ) : (
                clip.creator || clip.sourceName
              )}{' '}
              · {clip.license}
            </p>
          </section>
        )}

        {/* Country and language profile */}
        <div className="mx-5 mt-3 grid grid-cols-2 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 text-xs dark:border-neutral-800 dark:bg-neutral-950/50 sm:mx-6">
          <div className="min-h-16 border-b border-r border-neutral-200 p-3 dark:border-neutral-800">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-neutral-400">
              Language
            </span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200">
              {language.name}
            </span>
          </div>

          <div className="min-h-16 border-b border-neutral-200 p-3 dark:border-neutral-800">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-neutral-400">
              Language Family
            </span>
            <span className="font-bold leading-snug text-neutral-800 dark:text-neutral-200">
              {language.family} ({language.branch || 'Branch'})
            </span>
          </div>

          <div className="min-h-16 border-r border-neutral-200 p-3 dark:border-neutral-800">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-neutral-400">
              Speaker Region
            </span>
            <span className="font-bold leading-snug text-neutral-800 dark:text-neutral-200">
              {clip?.speakerRegion || language.geoAnchor.regionName || language.geoAnchor.countryName || language.geoAnchor.continent}
            </span>
          </div>

          <div className="min-h-16 p-3">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-neutral-400">
              Writing System
            </span>
            <span className="font-bold leading-snug text-neutral-800 dark:text-neutral-200">
              {language.scripts.join(', ')}
            </span>
          </div>
        </div>

        {clip && (
          <div className="mx-5 sm:mx-6">
            <AudioReviewCard
              challengeId={gameState.challengeId}
              audioClipId={clip.id}
              languageId={language.id}
              languageName={language.name}
            />
          </div>
        )}

        <div className="mx-5 sm:mx-6">
          <AppFeedbackSurvey challengeId={gameState.challengeId} />
        </div>

        {/* Footer actions: Share + Next Puzzle countdown */}
        <footer className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-200 px-5 py-4 dark:border-neutral-800 sm:px-6">
          <div className="min-w-0">
            <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-neutral-400">
              Next Mystery Voice
            </span>
            <span className="mt-0.5 block font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">
              {timeUntilNext}
            </span>
          </div>

          <button
            onClick={handleShare}
            className="flex h-11 shrink-0 cursor-pointer select-none items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 text-[11px] font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-emerald-700 active:translate-y-px"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Share Result</span>
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};
