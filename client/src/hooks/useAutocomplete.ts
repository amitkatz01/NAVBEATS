import { useState, useRef, useEffect, useCallback } from 'react';
import { searchPlaces } from '../services/searchService';
import type { SearchResult } from '../services/searchService';

// ── Types ──────────────────────────────────────────────────────────────────

export interface UseAutocompleteReturn {
  /** The current controlled value of the input. */
  inputValue: string;
  /** Live suggestion list (max 5 items from searchPlaces). */
  suggestions: SearchResult[];
  /** Whether the dropdown is visible. */
  isOpen: boolean;
  /** Index of the keyboard-highlighted suggestion (-1 = none). */
  activeIndex: number;
  /** Attach to the wrapper div that contains both the input and dropdown. */
  wrapperRef: React.RefObject<HTMLDivElement>;
  /** onChange handler — drives debounced search. */
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** onKeyDown handler — Arrow keys, Enter, Escape. */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** onBlur handler — closes dropdown when focus leaves the wrapper. */
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** Call when the user clicks a suggestion item. */
  selectSuggestion: (result: SearchResult) => void;
  /** Imperatively close the dropdown (e.g. on Escape). */
  closeDropdown: () => void;
}

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * Encapsulates all state and side effects for a single autocomplete input:
 * debounced search, in-flight request cancellation, keyboard navigation,
 * and click-outside / tab-away detection.
 *
 * Intentionally has no JSX dependency — works with any input element.
 *
 * @param debounceMs  How long to wait after the last keystroke before
 *                    sending a search request (default: 300 ms).
 */
export function useAutocomplete(debounceMs = 300): UseAutocompleteReturn {
  const [inputValue,  setInputValue]  = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [isOpen,      setIsOpen]      = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const abortRef   = useRef<AbortController | null>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ── Click-outside (mouse) ─────────────────────────────────────────────

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        isOpen &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSuggestions([]);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  // ── Cleanup on unmount ────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // ── Search ────────────────────────────────────────────────────────────

  const runSearch = useCallback((query: string) => {
    abortRef.current?.abort();

    if (query.trim().length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    searchPlaces(query, controller.signal)
      .then((results) => {
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setActiveIndex(-1);
      })
      .catch((err: unknown) => {
        // AbortError means a newer request was already fired — ignore silently
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // searchPlaces already logs and returns [] for other errors, so this
        // branch is only reached for unexpected promise rejections
        console.warn('[NavBeats] useAutocomplete: unexpected error', err);
      });
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      if (timerRef.current) clearTimeout(timerRef.current);

      if (value.trim().length < 3) {
        abortRef.current?.abort();
        setSuggestions([]);
        setIsOpen(false);
        setActiveIndex(-1);
        return;
      }

      timerRef.current = setTimeout(() => runSearch(value), debounceMs);
    },
    [debounceMs, runSearch],
  );

  const selectSuggestion = useCallback((result: SearchResult) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
    setInputValue(result.displayName);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
    // Keep suggestions in memory; they'll be cleared on the next change event
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, -1));
          break;

        case 'Enter':
          if (activeIndex >= 0 && suggestions[activeIndex]) {
            // Prevent the form from submitting when selecting a suggestion
            e.preventDefault();
            selectSuggestion(suggestions[activeIndex]);
          }
          // activeIndex === -1 → let the form's onSubmit fire normally
          break;

        case 'Escape':
          e.preventDefault();
          closeDropdown();
          break;
      }
    },
    [isOpen, activeIndex, suggestions, selectSuggestion, closeDropdown],
  );

  /** Closes the dropdown when focus leaves the entire wrapper (e.g. Tab). */
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (
        isOpen &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.relatedTarget as Node | null)
      ) {
        closeDropdown();
      }
    },
    [isOpen, closeDropdown],
  );

  return {
    inputValue,
    suggestions,
    isOpen,
    activeIndex,
    wrapperRef,
    handleChange,
    handleKeyDown,
    handleBlur,
    selectSuggestion,
    closeDropdown,
  };
}
