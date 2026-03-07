// ── Types ──────────────────────────────────────────────────────────────────

/** Resolved geographic position returned by the geocoder. */
export interface GeocodedLocation {
  lat: number;
  lng: number;
  /** Human-readable address string from Nominatim. */
  displayName: string;
}

/**
 * Subset of the Nominatim JSON response we actually consume.
 * Full schema: https://nominatim.org/release-docs/latest/api/Search/
 */
interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

// ── Error ──────────────────────────────────────────────────────────────────

/** Thrown for network failures or non-OK HTTP responses from Nominatim. */
export class GeocodingError extends Error {
  constructor(
    message: string,
    /** HTTP status code, or undefined for network-level failures. */
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'GeocodingError';
  }
}

// ── Constants ──────────────────────────────────────────────────────────────

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Nominatim's usage policy requires a descriptive User-Agent.
 * Update this string when the app has a public domain.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
const USER_AGENT = 'NavBeats/0.1 (navigation-music-app)';

// ── Core function ──────────────────────────────────────────────────────────

/**
 * Converts a free-text location query into geographic coordinates using the
 * Nominatim OpenStreetMap geocoding API.
 *
 * Returns the first (best-ranked) result, or `null` when the query produced
 * no matches. Throws `GeocodingError` on network or HTTP failures so callers
 * can distinguish "not found" (null) from "something broke" (thrown).
 *
 * @param query   - Free-text address or place name, e.g. "Eiffel Tower, Paris"
 * @param signal  - Optional AbortSignal to cancel an in-flight request (useful
 *                  when debouncing rapid user input).
 *
 * @example
 * const loc = await geocodeLocation('Times Square, New York');
 * if (loc) {
 *   map.setView([loc.lat, loc.lng], 14);
 * }
 */
export async function geocodeLocation(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodedLocation | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', trimmed);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  // Ask Nominatim to include a deduplicated result set
  url.searchParams.set('dedupe', '1');

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
    });
  } catch (err) {
    // Network error or aborted request – re-throw aborts as-is so callers
    // can check `err instanceof DOMException && err.name === 'AbortError'`.
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new GeocodingError(
      `Network request to Nominatim failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    throw new GeocodingError(
      `Nominatim returned HTTP ${response.status}`,
      response.status,
    );
  }

  const results: NominatimResult[] = await response.json();

  if (results.length === 0) return null;

  const { lat, lon, display_name } = results[0];
  return {
    lat: parseFloat(lat),
    lng: parseFloat(lon),
    displayName: display_name,
  };
}
