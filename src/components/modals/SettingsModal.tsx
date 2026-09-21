'use client';

import React from 'react';
import { X, Moon, Sun, Zap, Info } from 'lucide-react';
import { BRAND_CONFIG } from '@/config';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isReducedMotion: boolean;
  onToggleReducedMotion: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
  isReducedMotion,
  onToggleReducedMotion,
}) => {
  if (!isOpen) return null;

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
          Settings
        </h3>

        <div className="flex flex-col divide-y divide-neutral-200 border-y border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2.5">
              {isDarkMode ? (
                <Moon className="w-4 h-4 text-emerald-500" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              <div>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 block text-xs">
                  Dark Mode
                </span>
                <span className="text-[11px] text-neutral-400">
                  Toggle between light and dark appearance
                </span>
              </div>
            </div>

            <button
              onClick={onToggleDarkMode}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isDarkMode ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isDarkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-blue-500" />
              <div>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 block text-xs">
                  Reduced Motion
                </span>
                <span className="text-[11px] text-neutral-400">
                  Subtle animations and minimal globe rotation
                </span>
              </div>
            </div>

            <button
              onClick={onToggleReducedMotion}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isReducedMotion ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isReducedMotion ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Architecture & Sourcing notice */}
          <div className="py-4 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-1.5 font-semibold text-neutral-700 dark:text-neutral-300 mb-1 text-[11px] uppercase tracking-wider">
              <Info className="w-3.5 h-3.5 text-neutral-400" />
              <span>About {BRAND_CONFIG.name} MVP</span>
            </div>
            <p className="text-[11px] mb-1.5">
              Designed as an extensible sound & language deduction platform. Audio data, language catalogues, and AI clue endpoints operate behind modular service abstractions.
            </p>
            <div className="text-[10px] text-neutral-400 font-mono">
              Build v{BRAND_CONFIG.version} · Clean Typed Mock Layer
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
