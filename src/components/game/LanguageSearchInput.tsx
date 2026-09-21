'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronRight, X } from 'lucide-react';
import { CountryGuess } from '@/types';
import { languageRepository } from '@/services/languageRepository';

interface LanguageSearchInputProps {
  onSelectLanguage: (country: CountryGuess) => void;
  onSubmitGuess: (country: CountryGuess) => void;
  disabled?: boolean;
  disabledLanguageIds: string[];
  onOpenClue?: () => void;
}

export const LanguageSearchInput: React.FC<LanguageSearchInputProps> = ({
  onSelectLanguage,
  onSubmitGuess,
  disabled = false,
  disabledLanguageIds,
  onOpenClue,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CountryGuess[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<CountryGuess | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    let isCancelled = false;

    const performSearch = async () => {
      if (!query.trim()) {
        const defaultList = await languageRepository.getAllCountries();
        if (!isCancelled) {
          const available = defaultList.filter(
            (l) => !disabledLanguageIds.includes(l.id)
          );
          setResults(available.slice(0, 8));
        }
        return;
      }

      const matches = await languageRepository.searchCountries(query, 8);
      if (!isCancelled) {
        const available = matches.filter(
          (l) => !disabledLanguageIds.includes(l.id)
        );
        setResults(available);
        setHighlightedIndex(0);
      }
    };

    const timer = setTimeout(performSearch, 120);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query, disabledLanguageIds]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (lang: CountryGuess) => {
    setSelectedLanguage(lang);
    setQuery(lang.name);
    setIsOpen(false);
    onSelectLanguage(lang);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) =>
        prev <= 0 ? results.length - 1 : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && results[highlightedIndex]) {
        handleSelect(results[highlightedIndex]);
      } else if (selectedLanguage) {
        handleSubmit();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedLanguage || disabled) return;
    onSubmitGuess(selectedLanguage);
    setSelectedLanguage(null);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedLanguage(null);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative my-4 w-full">
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor="country-guess" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
          Your guess
        </label>
        {onOpenClue && !disabled && (
          <button
            type="button"
            onClick={onOpenClue}
            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Use your clue
          </button>
        )}
      </div>
      <div className="flex items-stretch gap-2">
        {/* Input box */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
            <Search className="w-4 h-4" />
          </div>

          <input
            id="country-guess"
            ref={inputRef}
            type="text"
            value={query}
            disabled={disabled}
            placeholder={disabled ? 'Challenge complete' : 'Search a country'}
            onFocus={() => !disabled && setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedLanguage(null);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className="h-[52px] w-full rounded-md border-2 border-neutral-300 bg-white pl-11 pr-10 text-[15px] font-medium text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-950 dark:border-neutral-700 dark:bg-[#0b1016] dark:text-white dark:placeholder:text-neutral-600 dark:focus:border-white disabled:cursor-not-allowed disabled:opacity-60"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            aria-label="Search and select country"
          />

          {query && !disabled && (
            <button
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              aria-label="Clear country input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Primary Guess Button */}
        <button
          onClick={handleSubmit}
          disabled={!selectedLanguage || disabled}
          className={`h-[52px] shrink-0 select-none rounded-md px-6 text-sm font-black uppercase tracking-[0.08em] transition-all duration-150 ${
            selectedLanguage && !disabled
              ? 'cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 active:translate-y-px'
              : 'cursor-not-allowed bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600'
          }`}
        >
          Guess
        </button>
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && !disabled && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-md border border-neutral-300 bg-white py-1 shadow-xl divide-y divide-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:divide-neutral-800">
          {results.map((lang, index) => {
            const isHighlighted = index === highlightedIndex;

            return (
              <div
                key={lang.id}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSelect(lang)}
                className={`flex cursor-pointer items-center justify-between px-3.5 py-3 text-sm transition-colors ${
                  isHighlighted
                    ? 'bg-neutral-100 dark:bg-neutral-800/80 text-emerald-600 dark:text-emerald-400'
                    : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-semibold">{lang.name}</span>
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    {lang.geoAnchor.regionName || 'Country'}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs text-neutral-400">
                  <span>{lang.geoAnchor.continent}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
