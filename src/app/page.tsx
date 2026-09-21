'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { CustomAudioPlayer } from '@/components/audio/CustomAudioPlayer';
import { GlobeView } from '@/components/globe/GlobeView';
import { AttemptIndicators } from '@/components/game/AttemptIndicators';
import { LanguageSearchInput } from '@/components/game/LanguageSearchInput';
import { GuessHistory } from '@/components/game/GuessHistory';
import { QuestionUnlockSection } from '@/components/game/QuestionUnlockSection';
import { ResultModal } from '@/components/modals/ResultModal';
import { StatsModal } from '@/components/modals/StatsModal';
import { HelpModal } from '@/components/modals/HelpModal';
import { SettingsModal } from '@/components/modals/SettingsModal';

import {
  Language,
  CountryGuess,
  AudioClip,
  DailyChallenge,
  DailyGameState,
  PlayerStats,
  GameStatus,
} from '@/types';
import { GAME_RULES, STORAGE_KEYS } from '@/config';
import { clueProvider } from '@/services/clueProvider';
import { statsRepository } from '@/services/statsRepository';
import { gameDataService } from '@/services/gameDataService';
import { gameplayGateway } from '@/services/gameplayGateway';
import { trackAnalyticsEvent } from '@/services/analyticsClient';

export default function HomePage() {
  // Core game data
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<Language | null>(null);
  const [audioClip, setAudioClip] = useState<AudioClip | null>(null);
  const [gameState, setGameState] = useState<DailyGameState | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);

  // UI / Modals state
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isResultOpen, setIsResultOpen] = useState<boolean>(false);
  const [isAskingClue, setIsAskingClue] = useState<boolean>(false);
  const [isCluePromptDismissed, setIsCluePromptDismissed] = useState<boolean>(false);
  const [shakeError, setShakeError] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Settings state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);

  // Helper to format date string YYYY-MM-DD
  const getTodayDateStr = (): string => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Initialize theme and load settings
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEYS.settings);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        const darkMode = !!parsed.darkMode;
        const reducedMotion = !!parsed.reducedMotion;
        setTimeout(() => {
          setIsDarkMode(darkMode);
          setIsReducedMotion(reducedMotion);
        }, 0);
        if (darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTimeout(() => {
          setIsDarkMode(prefersDark);
        }, 0);
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        }
      }
    } catch {}
  }, []);

  const handleToggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem(
        STORAGE_KEYS.settings,
        JSON.stringify({ darkMode: nextMode, reducedMotion: isReducedMotion })
      );
    } catch {}
  };

  const handleToggleReducedMotion = () => {
    const next = !isReducedMotion;
    setIsReducedMotion(next);
    try {
      localStorage.setItem(
        STORAGE_KEYS.settings,
        JSON.stringify({ darkMode: isDarkMode, reducedMotion: next })
      );
    } catch {}
  };

  // Initialize daily game state and load data
  useEffect(() => {
    const initGame = async () => {
      const dateStr = getTodayDateStr();
      try {
        const [{ challenge: dailyChallenge, language: targetLang, clip }, userStats, savedState] = await Promise.all([
          gameDataService.getDailyGame(dateStr),
          statsRepository.getStats(),
          statsRepository.getGameState(dateStr),
        ]);

        setChallenge(dailyChallenge);

        setTargetLanguage(targetLang);
        setAudioClip(clip);
        setStats(userStats);
        trackAnalyticsEvent('challenge_view', {
          challengeId: dailyChallenge.id,
          challengeNumber: dailyChallenge.challengeNumber,
          audioClipId: dailyChallenge.audioClipId,
          languageId: dailyChallenge.languageId,
        });

        const savedStateMatchesChallenge =
          savedState?.challengeId === dailyChallenge.id &&
          savedState.languageId === dailyChallenge.languageId &&
          savedState.audioClipId === dailyChallenge.audioClipId;

        if (savedState && savedStateMatchesChallenge) {
          setGameState(savedState);
          if (savedState.status !== 'PLAYING') {
            setTimeout(() => setIsResultOpen(true), 600);
          }
        } else {
          const newState: DailyGameState = {
            challengeId: dailyChallenge.id,
            date: dateStr,
            challengeNumber: dailyChallenge.challengeNumber,
            languageId: dailyChallenge.languageId,
            audioClipId: dailyChallenge.audioClipId,
            guesses: [],
            status: 'PLAYING',
          };
          setGameState(newState);
          await statsRepository.saveGameState(newState);
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Today’s game could not be loaded.');
      }
    };

    initGame();
  }, []);

  // Move an already-open tab to the next daily challenge at local midnight.
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    const timer = window.setTimeout(
      () => window.location.reload(),
      Math.max(1000, nextMidnight.getTime() - now.getTime() + 250)
    );
    return () => window.clearTimeout(timer);
  }, []);

  // Handle guess submission
  const handleSubmitGuess = useCallback(
    async (guessedCountry: CountryGuess) => {
      if (!gameState || !targetLanguage || gameState.status !== 'PLAYING') return;

      // Prevent duplicate guesses
      if (gameState.guesses.some((g) => g.guessedLanguageId === guessedCountry.id)) {
        setShakeError(true);
        setTimeout(() => setShakeError(false), 500);
        return;
      }

      const attemptNumber = gameState.guesses.length + 1;
      const guessResult = await gameplayGateway.evaluateCountryGuess({
        challengeId: gameState.challengeId,
        country: guessedCountry,
        attemptNumber,
      });

      const updatedGuesses = [...gameState.guesses, guessResult];
      let newStatus: GameStatus = gameState.status;

      if (guessResult.isCorrect) {
        newStatus = 'WON';
      } else if (updatedGuesses.length >= GAME_RULES.maxGuesses) {
        newStatus = 'LOST';
      }

      const updatedState: DailyGameState = {
        ...gameState,
        guesses: updatedGuesses,
        status: newStatus,
        completedAt: newStatus !== 'PLAYING' ? new Date().toISOString() : undefined,
      };

      setGameState(updatedState);
      await statsRepository.saveGameState(updatedState);

      // If game concluded, record completion in stats and open result screen
      if (newStatus !== 'PLAYING') {
        trackAnalyticsEvent('challenge_complete', {
          challengeId: updatedState.challengeId,
          challengeNumber: updatedState.challengeNumber,
          audioClipId: updatedState.audioClipId,
          languageId: updatedState.languageId,
          outcome: newStatus,
          attempts: updatedState.guesses.length,
        });
        const updatedStats = await statsRepository.recordGameCompletion(
          updatedState,
          targetLanguage.geoAnchor.countryName || targetLanguage.name
        );
        setStats(updatedStats);

        // Smooth delay so the user sees the globe rotate to the target first
        setTimeout(() => {
          setIsResultOpen(true);
        }, 1100);
      }
    },
    [gameState, targetLanguage]
  );

  // Handle asking AI clue question
  const handleAskClueQuestion = async (question: string) => {
    if (!gameState || !targetLanguage || gameState.questionAsked || isAskingClue) return;

    setIsAskingClue(true);
    try {
      const response = await clueProvider.answerQuestion(targetLanguage, question);

      const updatedState: DailyGameState = {
        ...gameState,
        questionAsked: {
          question,
          response,
        },
      };

      setGameState(updatedState);
      await statsRepository.saveGameState(updatedState);
    } finally {
      setIsAskingClue(false);
    }
  };

  const isGameComplete = gameState ? gameState.status !== 'PLAYING' : false;
  const isGameWon = gameState ? gameState.status === 'WON' : false;

  const guessedLanguageIds = gameState ? gameState.guesses.map((g) => g.guessedLanguageId) : [];

  // Unlock question after 2 incorrect guesses
  const isQuestionUnlocked =
    (gameState?.guesses.length || 0) >= GAME_RULES.aiQuestionUnlockAfterGuess &&
    !isGameWon;
  const showClueComposer =
    isQuestionUnlocked && !gameState?.questionAsked && !isCluePromptDismissed;

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfb] dark:bg-[#070b10] text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* Header */}
      <Header
        challengeNumber={challenge?.challengeNumber || 1}
        dateStr={challenge?.date || getTodayDateStr()}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-16 pt-5 sm:pt-7">
        {loadError && (
          <div role="alert" className="mb-4 rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            {loadError}
          </div>
        )}
        <div className="mb-5 select-none text-center">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            One mystery voice every day
          </p>
          <h1 className="font-sans text-[30px] font-black leading-tight tracking-[-0.04em] text-neutral-950 dark:text-white sm:text-4xl">
            Where is this speaker from?
          </h1>
          <p className="mt-2 font-sans text-sm text-neutral-500 dark:text-neutral-400">
            Listen to the voice. Read the map. Find the country in five guesses.
          </p>
        </div>

        <section aria-label="Daily audio clue" className="mb-4 sm:mb-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
              Today’s audio
            </span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">Tap to listen</span>
          </div>
          <CustomAudioPlayer
            clip={audioClip}
          />
          {audioClip?.translationEnglish && (
            <p className="mt-2.5 px-1 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                English translation:
              </span>{' '}
              “{audioClip.translationEnglish}”
            </p>
          )}
        </section>

        <GlobeView
          guesses={gameState?.guesses || []}
          targetAnchor={isGameComplete ? targetLanguage?.geoAnchor : null}
          isGameComplete={isGameComplete}
        />

        <AttemptIndicators
          guesses={gameState?.guesses || []}
          isGameComplete={isGameComplete}
        />

        {showClueComposer ? (
          <QuestionUnlockSection
            unlocked
            onAskQuestion={handleAskClueQuestion}
            onSkip={() => setIsCluePromptDismissed(true)}
            isLoading={isAskingClue}
          />
        ) : (
          <div className={shakeError ? 'animate-shake' : ''}>
            <LanguageSearchInput
              onSelectLanguage={() => {}}
              onSubmitGuess={handleSubmitGuess}
              disabled={isGameComplete}
              disabledLanguageIds={guessedLanguageIds}
              onOpenClue={
                isQuestionUnlocked && !gameState?.questionAsked
                  ? () => setIsCluePromptDismissed(false)
                  : undefined
              }
            />
          </div>
        )}

        {gameState && gameState.guesses.length > 0 && (
          <GuessHistory
            guesses={gameState.guesses}
            questionAsked={gameState.questionAsked}
          />
        )}

        {isGameComplete && (
          <div className="my-5 text-center">
            <button
              onClick={() => setIsResultOpen(true)}
              className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-md bg-emerald-600 px-5 text-xs font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-emerald-700"
            >
              <span>View results & share</span>
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      {targetLanguage && gameState && (
        <ResultModal
          isOpen={isResultOpen}
          onClose={() => setIsResultOpen(false)}
          language={targetLanguage}
          clip={audioClip}
          gameState={gameState}
          currentStreak={stats?.currentStreak || 0}
        />
      )}

      {stats && (
        <StatsModal
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
          stats={stats}
        />
      )}

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        isReducedMotion={isReducedMotion}
        onToggleReducedMotion={handleToggleReducedMotion}
      />
    </div>
  );
}
