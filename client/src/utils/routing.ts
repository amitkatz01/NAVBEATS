import type { LatLng } from '../components/RouteControls';
import type { TransportMode } from '../components/RouteControls';

// ── Types ──────────────────────────────────────────────────────────────────

/** Route data returned by the routing utility. */
export interface RouteData {
  /** Ordered path as [lat, lng] tuples — ready for Leaflet Polyline. */
  coordinates: [number, number][];
  /** Total route distance in metres. */
  distance: number;
  /** Total route duration in seconds. */
  duration: number;
}

/**
 * Minimal slice of the OpenRouteService FeatureCollection response we use.
 * Full schema: https://openrouteservice.org/dev/#/api-docs/v2/directions/{profile}/get
 */
interface ORSFeature {
  geometry: {
    type: 'LineString';
    /** ORS returns [longitude, latitude] — must be swapped for Leaflet. */
    coordinates: [number, number][];
  };
  properties: {
    summary: {
      distance: number; // metres
      duration: number; // seconds
    };
  };
}

interface ORSResponse {
  type: 'FeatureCollection';
  features: ORSFeature[];
}

// ── Error ──────────────────────────────────────────────────────────────────

/** Thrown for network failures or non-OK HTTP responses from ORS. */
export class RoutingError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'RoutingError';
  }
}

// ── Profile map ────────────────────────────────────────────────────────────

const ORS_PROFILES: Record<TransportMode, string> = {
  drive: 'driving-car',
  walk:  'foot-walking',
};

// ── Core function ──────────────────────────────────────────────────────────

/**
 * Fetches a turn-by-turn route from the OpenRouteService Directions API and
 * returns the decoded path in a Leaflet-compatible format.
 *
 * @param origin      - Start point (lat/lng from geocoder)
 * @param destination - End point   (lat/lng from geocoder)
 * @param mode        - Transport profile: 'drive' or 'walk'
 * @param signal      - Optional AbortSignal for request cancellation
 *
 * @throws {RoutingError}  On HTTP errors or network failures
 * @throws {DOMException}  When the request is aborted via signal
 */
export async function getRoute(
  origin: LatLng,
  destination: LatLng,
  mode: TransportMode,
  signal?: AbortSignal,
): Promise<RouteData> {
  const apiKey = import.meta.env.VITE_ORS_API_KEY as string | undefined;
  if (!apiKey) {
    throw new RoutingError(
      'VITE_ORS_API_KEY is not set. Add it to client/.env and restart the dev server.',
    );
  }

  const profile = ORS_PROFILES[mode];

  // ORS GET endpoint expects coordinates as "lng,lat" (longitude first)
  const url = new URL(
    `https://api.openrouteservice.org/v2/directions/${profile}`,
  );
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('start', `${origin.lng},${origin.lat}`);
  url.searchParams.set('end',   `${destination.lng},${destination.lat}`);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      signal,
      headers: { Accept: 'application/json, application/geo+json' },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new RoutingError(
      `Network request to OpenRouteService failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    // ORS returns structured error JSON — surface the message when possible
    let detail = '';
    try {
      const body = await response.json();
      detail = body?.error?.message ?? body?.message ?? '';
    } catch {
      // ignore parse failure; we'll use the status code alone
    }
    throw new RoutingError(
      `ORS returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`,
      response.status,
    );
  }

  const data: ORSResponse = await response.json();
  const feature = data.features[0];

  if (!feature) {
    throw new RoutingError('ORS returned an empty feature collection — no route found.');
  }

  // ORS geometry is [lng, lat]; Leaflet expects [lat, lng] — swap every pair
  const coordinates: [number, number][] = feature.geometry.coordinates.map(
    ([lng, lat]) => [lat, lng],
  );

  return {
    coordinates,
    distance: feature.properties.summary.distance,
    duration: feature.properties.summary.duration,
  };
}
