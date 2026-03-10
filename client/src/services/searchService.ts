// ── Types ──────────────────────────────────────────────────────────────────

/**
 * Provider-agnostic place search result. The rest of the app depends on this
 * shape only — not on Nominatim's raw schema — so the provider can be swapped
 * without touching any component.
 */
export interface SearchResult {
  displayName: string;
  lat: number;
  /** Intentionally `lon` (not `lng`) to match the GeoJSON / ORS convention. */
  lon: number;
}

/**
 * Subset of the Nominatim search response we map from.
 * Full schema: https://nominatim.org/release-docs/latest/api/Search/
 */
interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'NavBeats/0.1 (navigation-music-app)';
const MAX_RESULTS = 5;
const MIN_QUERY_LENGTH = 3;

// ── Service function ───────────────────────────────────────────────────────

/**
 * Searches for places matching `query` using the Nominatim API and returns up
 * to 5 normalized results.
 *
 * Designed to be safe in every failure mode:
 * - Returns `[]` for queries shorter than 3 characters (skips the request).
 * - Returns `[]` silently on network errors, HTTP errors, or parse failures.
 * - Re-throws `AbortError` so the caller can distinguish "cancelled" from
 *   "failed" — the `useAutocomplete` hook uses this to suppress stale updates.
 *
 * @param query  - Free-text place/address query
 * @param signal - AbortSignal from the caller's AbortController
 */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set('q', trimmed);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(MAX_RESULTS));
  url.searchParams.set('addressdetails', '1');

  try {
    const response = await fetch(url.toString(), {
      signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      console.warn(`[NavBeats] searchPlaces: Nominatim HTTP ${response.status}`);
      return [];
    }

    const data: NominatimItem[] = await response.json();

    return data.map((item) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }));
  } catch (err) {
    // Propagate abort so the hook can discard the stale update cleanly
    if (err instanceof DOMException && err.name === 'AbortError') throw err;

    // Any other network/parse failure: degrade gracefully
    console.warn('[NavBeats] searchPlaces failed:', err);
    return [];
  }
}
