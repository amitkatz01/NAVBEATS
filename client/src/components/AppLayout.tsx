import { useState, useCallback } from 'react';
import './AppLayout.css';
import MapView from './MapView';
import type { RouteMarker } from './MapView';
import RouteControls from './RouteControls';
import type { RouteRequest } from './RouteControls';
import { geocodeLocation, GeocodingError } from '../utils/geocoding';

function AppLayout() {
  const [routeMarkers, setRouteMarkers] = useState<RouteMarker[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleRouteRequest = useCallback(async (request: RouteRequest) => {
    setIsGeocoding(true);

    try {
      // Resolve both locations in parallel to minimise latency
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

      // Log the enriched request for the next integration step (routing)
      const resolvedRequest: RouteRequest = {
        ...request,
        originCoords:      { lat: originResult.lat,      lng: originResult.lng },
        destinationCoords: { lat: destinationResult.lat, lng: destinationResult.lng },
      };
      console.log('[NavBeats] Route resolved:', resolvedRequest);

      // Push markers to the map; MapController will fit the bounds automatically
      setRouteMarkers([
        {
          position: [originResult.lat, originResult.lng],
          type: 'origin',
          label: originResult.displayName,
        },
        {
          position: [destinationResult.lat, destinationResult.lng],
          type: 'destination',
          label: destinationResult.displayName,
        },
      ]);
    } catch (err) {
      if (err instanceof GeocodingError) {
        console.error(
          `[NavBeats] GeocodingError (HTTP ${err.status ?? 'network'}):`,
          err.message,
        );
      } else {
        console.error('[NavBeats] Unexpected error during geocoding:', err);
      }
    } finally {
      setIsGeocoding(false);
    }
  }, []);

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
          <MapView markers={routeMarkers} />
        </section>

        <section className="app-main__panel app-main__panel--controls">
          <h2 className="app-main__panel-title">Route &amp; controls</h2>
          <RouteControls
            onRouteRequest={handleRouteRequest}
            isLoading={isGeocoding}
          />
        </section>
      </main>
    </div>
  );
}

export default AppLayout;
