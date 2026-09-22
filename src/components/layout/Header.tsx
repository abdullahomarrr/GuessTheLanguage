'use client';

import React from 'react';
import { BRAND_CONFIG } from '@/config';
import { HelpCircle, BarChart2, Settings } from 'lucide-react';

interface HeaderProps {
  challengeNumber: number;
  dateStr: string;
  onOpenHelp: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  challengeNumber,
  dateStr,
  onOpenHelp,
  onOpenStats,
  onOpenSettings,
}) => {
  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(`${dateStr}T00:00:00`);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }, [dateStr]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-[#fbfbfb]/95 dark:border-neutral-800 dark:bg-[#070b10]/95 backdrop-blur-lg transition-colors">
      <div className="relative mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <div className="flex min-w-[92px] items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
          <span>#{challengeNumber}</span>
          <span className="hidden text-neutral-300 dark:text-neutral-700 sm:inline">/</span>
          <span className="hidden sm:inline">{formattedDate}</span>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 select-none cursor-default">
          <span className="text-xl font-black tracking-[-0.04em] uppercase text-neutral-950 dark:text-white font-sans">
            {BRAND_CONFIG.name}
          </span>
          <span className="ml-1.5 rounded-sm bg-emerald-600 px-1.5 py-0.5 align-[2px] text-[8px] font-black tracking-[0.12em] text-white">
            DAILY
          </span>
        </div>

        <div className="flex min-w-[92px] items-center justify-end gap-0.5">
          <button
            onClick={onOpenHelp}
            className="grid size-11 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white sm:size-9"
            title="How to Play"
            aria-label="How to Play"
          >
            <HelpCircle className="size-[18px]" />
          </button>
          <button
            onClick={onOpenStats}
            className="grid size-11 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white sm:size-9"
            title="Statistics"
            aria-label="Statistics"
          >
            <BarChart2 className="size-[18px]" />
          </button>
          <button
            onClick={onOpenSettings}
            className="grid size-11 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white sm:size-9"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="size-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
};
