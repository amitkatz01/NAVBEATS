import type { SearchResult } from '../services/searchService';
import './SuggestionDropdown.css';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SuggestionDropdownProps {
  /** Must match the `aria-controls` value on the associated input. */
  id: string;
  suggestions: SearchResult[];
  /** Keyboard-highlighted index (-1 = none). */
  activeIndex: number;
  onSelect: (result: SearchResult) => void;
}

// ── Component ──────────────────────────────────────────────────────────────

function SuggestionDropdown({
  id,
  suggestions,
  activeIndex,
  onSelect,
}: SuggestionDropdownProps) {
  if (suggestions.length === 0) return null;

  return (
    <ul
      id={id}
      className="suggestion-dropdown"
      role="listbox"
      aria-label="Location suggestions"
    >
      {suggestions.map((result, index) => {
        const isActive = index === activeIndex;
        const optionId = `${id}-opt-${index}`;

        return (
          <li
            key={`${result.lat}-${result.lon}-${index}`}
            id={optionId}
            role="option"
            aria-selected={isActive}
            className={`suggestion-dropdown__item${isActive ? ' suggestion-dropdown__item--active' : ''}`}
            // onMouseDown (not onClick) so the input doesn't blur before we
            // can register the selection. e.preventDefault() suppresses blur.
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(result);
            }}
          >
            <span className="suggestion-dropdown__name" title={result.displayName}>
              {result.displayName}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default SuggestionDropdown;
