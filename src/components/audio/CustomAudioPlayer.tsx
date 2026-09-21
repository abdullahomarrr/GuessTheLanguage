'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { audioPlayerService, AudioPlaybackState } from '@/services/audioPlayerService';
import { AudioClip } from '@/types';

interface CustomAudioPlayerProps {
  clip: AudioClip | null;
  disabled?: boolean;
}

// Fixed acoustic profile representing natural human speech rhythm
const SPEECH_PATTERN = [
  28, 42, 65, 80, 50, 35, 75, 95, 85, 45, 30, 60, 88, 100, 78, 55,
  38, 70, 92, 84, 60, 40, 65, 90, 80, 48, 32, 58, 85, 92, 70, 45,
  30, 50, 75, 60, 38, 25
];

export const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({
  clip,
  disabled = false,
}) => {
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 8.5,
    progress: 0,
    frequencies: new Array(38).fill(0.3),
    hasError: false,
  });

  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);

  // Subscribe to audio player service updates
  useEffect(() => {
    const unsubscribe = audioPlayerService.subscribe((state) => {
      setPlaybackState(state);
    });
    return unsubscribe;
  }, []);

  // When clip changes, load it into the player service
  useEffect(() => {
    if (clip) {
      audioPlayerService.loadClip(
        clip.audioUrl,
        clip.durationSeconds
      );
    }
  }, [clip]);

  const handleTogglePlay = () => {
    if (disabled || !clip) return;
    if (playbackState.isPlaying) {
      audioPlayerService.pause();
    } else {
      audioPlayerService.play();
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !clip || !waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(1, clickX / rect.width));
    audioPlayerService.seek(newProgress);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoverProgress(Math.max(0, Math.min(1, x / rect.width)));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const barsCount = SPEECH_PATTERN.length;

  return (
    <div className="w-full">
      <div className="flex h-[68px] items-center border-y border-neutral-300 bg-transparent px-1 dark:border-neutral-800">
        <div className="flex w-full min-w-0 items-center gap-4">
          <button
            onClick={handleTogglePlay}
            disabled={disabled || !clip}
            className="flex size-11 shrink-0 cursor-pointer select-none items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_0_0_4px_rgba(5,150,105,0.1)] transition-all hover:bg-emerald-700 hover:shadow-[0_0_0_5px_rgba(5,150,105,0.14)] active:scale-95 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 disabled:shadow-none dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600"
            aria-label={playbackState.isPlaying ? 'Pause audio' : 'Play audio'}
          >
            {playbackState.isPlaying ? (
              <Pause className="size-[18px] fill-current" />
            ) : (
              <Play className="ml-0.5 size-[18px] fill-current" />
            )}
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-4 pr-1">
            <div
              ref={waveformRef}
              onClick={handleWaveformClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverProgress(null)}
              className="group flex h-8 min-w-0 flex-1 cursor-pointer items-center justify-between gap-[2px] py-1 sm:gap-[3px]"
              title="Click to seek"
            >
              {SPEECH_PATTERN.map((baseHeight, index) => {
                const barProgress = (index + 0.5) / barsCount;
                const isPassed = barProgress <= playbackState.progress;
                const isHovered = hoverProgress !== null && barProgress <= hoverProgress;

                // Live dynamic frequency modulation when playing
                let height = baseHeight;
                if (playbackState.isPlaying) {
                  const freq = playbackState.frequencies[index % playbackState.frequencies.length] || 0.3;
                  height = Math.max(18, Math.min(100, baseHeight * (0.6 + freq * 0.8)));
                }

                return (
                  <div
                    key={index}
                    className="relative flex h-full flex-1 items-center justify-center"
                  >
                    <div
                      style={{ height: `${height}%` }}
                      className={`w-full max-w-[3px] rounded-full transition-colors duration-100 ${
                        isPassed
                          ? 'bg-emerald-500'
                          : isHovered
                          ? 'bg-neutral-500 dark:bg-neutral-400'
                          : 'bg-neutral-300 dark:bg-neutral-700'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            <span className={`shrink-0 text-xs font-bold tabular-nums ${playbackState.hasError ? 'text-red-500' : 'font-mono text-neutral-500 dark:text-neutral-400'}`}>
              {playbackState.hasError ? 'Audio unavailable' : formatTime(playbackState.duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
