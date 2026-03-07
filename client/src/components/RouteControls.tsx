import { useState } from 'react';
import './RouteControls.css';

// ── Types ──────────────────────────────────────────────────────────────────

export type TransportMode = 'drive' | 'walk';

/** Geographic coordinate pair – populated by geocoding (not yet implemented). */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Shape of the request emitted when the user submits the form. */
export interface RouteRequest {
  originText: string;
  destinationText: string;
  /** Null until a geocoding integration resolves the text to coordinates. */
  originCoords: LatLng | null;
  destinationCoords: LatLng | null;
  mode: TransportMode;
}

export interface RouteControlsProps {
  /** Called when the user presses "Generate Route". Receives the full request
   *  object; coords will be null until geocoding is wired in. */
  onRouteRequest?: (request: RouteRequest) => void;
}

// ── Icons ──────────────────────────────────────────────────────────────────

function IconOrigin() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="5" r="2" fill="currentColor" />
    </svg>
  );
}

function IconDestination() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M5 1 L9 9 L5 7 L1 9 Z" fill="currentColor" />
    </svg>
  );
}

function IconCar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 17H3a1 1 0 0 1-1-1v-5l2.5-6h11L18 11v5a1 1 0 0 1-1 1h-2M5 17h14M5 17v2M19 17v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="17" r="1.5" fill="currentColor" />
      <circle cx="16.5" cy="17" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconWalk() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="4" r="1.5" fill="currentColor" />
      <path
        d="M9 9l1.5-3.5h3L15 9l-2 2v4l2 4M9 9l-2 6M13 15l-1 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

function RouteControls({ onRouteRequest }: RouteControlsProps) {
  const [originText, setOriginText] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [mode, setMode] = useState<TransportMode>('drive');

  const canSubmit = originText.trim().length > 0 && destinationText.trim().length > 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    onRouteRequest?.({
      originText: originText.trim(),
      destinationText: destinationText.trim(),
      originCoords: null,       // geocoding not yet implemented
      destinationCoords: null,
      mode,
    });
  }

  return (
    <form className="route-controls" onSubmit={handleSubmit} noValidate>

      {/* ── Route inputs ── */}
      <div className="route-controls__fields">

        {/* Origin */}
        <div className="route-controls__field">
          <label className="route-controls__label" htmlFor="rc-origin">
            <span className="route-controls__label-icon route-controls__label-icon--origin">
              <IconOrigin />
            </span>
            Start
          </label>
          {/* Wrapper keeps future autocomplete dropdown in scope */}
          <div className="route-controls__input-wrapper">
            <input
              id="rc-origin"
              type="text"
              className="route-controls__input"
              placeholder="Enter start location…"
              value={originText}
              onChange={(e) => setOriginText(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            {/* Autocomplete suggestion list – hoisted here later */}
          </div>
        </div>

        {/* Visual connector between the two inputs */}
        <div className="route-controls__connector" aria-hidden="true">
          <span className="route-controls__connector-line" />
        </div>

        {/* Destination */}
        <div className="route-controls__field">
          <label className="route-controls__label" htmlFor="rc-destination">
            <span className="route-controls__label-icon route-controls__label-icon--dest">
              <IconDestination />
            </span>
            Destination
          </label>
          <div className="route-controls__input-wrapper">
            <input
              id="rc-destination"
              type="text"
              className="route-controls__input"
              placeholder="Enter destination…"
              value={destinationText}
              onChange={(e) => setDestinationText(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* ── Transport mode toggle ── */}
      <div
        className="route-controls__mode-group"
        role="group"
        aria-label="Transport mode"
      >
        <button
          type="button"
          className={`route-controls__mode-btn${mode === 'drive' ? ' route-controls__mode-btn--active' : ''}`}
          onClick={() => setMode('drive')}
          aria-pressed={mode === 'drive'}
        >
          <IconCar />
          Drive
        </button>
        <button
          type="button"
          className={`route-controls__mode-btn${mode === 'walk' ? ' route-controls__mode-btn--active' : ''}`}
          onClick={() => setMode('walk')}
          aria-pressed={mode === 'walk'}
        >
          <IconWalk />
          Walk
        </button>
      </div>

      {/* ── Generate Route ── */}
      <button
        type="submit"
        className="route-controls__submit"
        disabled={!canSubmit}
        aria-disabled={!canSubmit}
      >
        <span>Generate Route</span>
        <IconArrow />
      </button>

    </form>
  );
}

export default RouteControls;
