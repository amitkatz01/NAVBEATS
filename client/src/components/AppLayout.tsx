import { useState, useCallback } from 'react';
import './AppLayout.css';
import MapView from './MapView';
import type { RouteMarker } from './MapView';
import RouteControls from './RouteControls';
import type {
  RouteRequest,
  TransportMode,
  LocationRole,
  LocationSelection,
} from './RouteControls';
import { geocodeLocation, GeocodingError } from '../utils/geocoding';
import { getRoute, RoutingError } from '../utils/routing';
import type { RouteData } from '../utils/routing';

function AppLayout() {
  const [routeMarkers, setRouteMarkers] = useState<RouteMarker[]>([]);
  const [routeData,    setRouteData]    = useState<RouteData | null>(null);
  const [routeMode,    setRouteMode]    = useState<TransportMode | null>(null);
  const [isLoading,    setIsLoading]    = useState(false);

  const handleRouteRequest = useCallback(async (request: RouteRequest) => {
    // Clear previous results immediately so the map doesn't show stale data
    setRouteMarkers([]);
    setRouteData(null);
    setRouteMode(null);
    setIsLoading(true);

    try {
      // ── Step 1: Geocode both locations in parallel ──────────────────────
      const [originResult, destinationResult] = await Promise.all([
        geocodeLocation(request.originText),
        geocodeLocation(request.destinationText),
      ]);

      if (!originResult) {
        console.warn('[NavBeats] No geocoding result for origin:', request.originText);
        return;
      }
      if (!destinationResult) {
        console.warn('[NavBeats] No geocoding result for destination:', request.destinationText);
        return;
      }

      const originCoords      = { lat: originResult.lat,      lng: originResult.lng };
      const destinationCoords = { lat: destinationResult.lat, lng: destinationResult.lng };

      // Place the markers right away so the map updates while routing loads
      setRouteMarkers([
        { position: [originCoords.lat,      originCoords.lng],      type: 'origin',      label: originResult.displayName },
        { position: [destinationCoords.lat, destinationCoords.lng], type: 'destination', label: destinationResult.displayName },
      ]);

      // ── Step 2: Fetch the route ─────────────────────────────────────────
      const route = await getRoute(originCoords, destinationCoords, request.mode);

      setRouteData(route);
      setRouteMode(request.mode);

      console.log(
        `[NavBeats] Route (${request.mode}): ${(route.distance / 1000).toFixed(1)} km, ` +
        `${Math.round(route.duration / 60)} min`,
      );
    } catch (err) {
      if (err instanceof GeocodingError) {
        console.error(
          `[NavBeats] GeocodingError (HTTP ${err.status ?? 'network'}):`,
          err.message,
        );
      } else if (err instanceof RoutingError) {
        console.error(
          `[NavBeats] RoutingError (HTTP ${err.status ?? 'network'}):`,
          err.message,
        );
      } else {
        console.error('[NavBeats] Unexpected error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLocationPreview = useCallback(
    (role: LocationRole, selection: LocationSelection) => {
      // Clear any previously drawn route so we only show markers while the user
      // is still deciding on locations.
      setRouteData(null);
      setRouteMode(null);

      setRouteMarkers((prev) => {
        const next = prev.filter((marker) => marker.type !== role);
        next.push({
          position: [selection.coords.lat, selection.coords.lng],
          type: role,
          label: selection.label,
        });
        return next;
      });
    },
    [],
  );

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__logo">NB</div>
          <div className="app-header__text">
            <span className="app-header__title">NAVBEATS</span>
            <span className="app-header__subtitle">Soundtracking every turn.</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="app-main__panel app-main__panel--map">
          <h2 className="app-main__panel-title">Map view</h2>
          <MapView
            markers={routeMarkers}
            routeCoordinates={routeData?.coordinates}
            routeInfo={
              routeData && routeMode
                ? { distance: routeData.distance, duration: routeData.duration, mode: routeMode }
                : undefined
            }
          />
        </section>

        <section className="app-main__panel app-main__panel--controls">
          <h2 className="app-main__panel-title">Route &amp; controls</h2>
          <RouteControls
            onRouteRequest={handleRouteRequest}
            isLoading={isLoading}
            onLocationPreview={handleLocationPreview}
          />
        </section>
      </main>
    </div>
  );
}

export default AppLayout;
