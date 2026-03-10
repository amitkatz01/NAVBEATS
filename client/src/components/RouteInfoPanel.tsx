import type { TransportMode } from './RouteControls';
import './RouteInfoPanel.css';

// ── Types ──────────────────────────────────────────────────────────────────

export interface RouteInfoPanelProps {
  /** Total route distance in metres (from routing utility). */
  distance: number;
  /** Total route duration in seconds (from routing utility). */
  duration: number;
  mode: TransportMode;
}

// ── Formatters ─────────────────────────────────────────────────────────────

function formatDistance(metres: number): string {
  return `${(metres / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const totalMins = Math.round(seconds / 60);
  if (totalMins < 60) return `${totalMins} min`;
  const hours   = Math.floor(totalMins / 60);
  const minutes = totalMins % 60;
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
}

const MODE_LABELS: Record<TransportMode, string> = {
  drive: 'Drive',
  walk:  'Walk',
};

// ── Component ──────────────────────────────────────────────────────────────

function RouteInfoPanel({ distance, duration, mode }: RouteInfoPanelProps) {
  return (
    <div className="route-info-panel" role="status" aria-live="polite">
      <span className="route-info-panel__item">
        {formatDistance(distance)}
      </span>
      <span className="route-info-panel__sep" aria-hidden="true">•</span>
      <span className="route-info-panel__item">
        {formatDuration(duration)}
      </span>
      <span className="route-info-panel__sep" aria-hidden="true">•</span>
      <span className="route-info-panel__item route-info-panel__item--mode">
        {MODE_LABELS[mode]}
      </span>
    </div>
  );
}

export default RouteInfoPanel;
