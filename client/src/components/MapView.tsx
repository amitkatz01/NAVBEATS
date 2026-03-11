import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';
import RouteInfoPanel from './RouteInfoPanel';
import type { RouteInfoPanelProps } from './RouteInfoPanel';

// ── Types ──────────────────────────────────────────────────────────────────

export interface RouteMarker {
  position: [number, number];
  type: 'origin' | 'destination';
  label: string;
}

// ── Custom DivIcons ────────────────────────────────────────────────────────

function makeDivIcon(type: 'origin' | 'destination'): L.DivIcon {
  const isOrigin = type === 'origin';

  const svg = isOrigin
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
         <circle cx="11" cy="11" r="9" fill="#9333ea" stroke="#c084fc" stroke-width="2"/>
         <circle cx="11" cy="11" r="3.5" fill="#fff"/>
       </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" viewBox="0 0 22 30">
         <path d="M11 0C4.925 0 0 4.925 0 11c0 8.25 11 19 11 19S22 19.25 22 11C22 4.925 17.075 0 11 0z"
               fill="#a855f7" stroke="#c084fc" stroke-width="1.5"/>
         <circle cx="11" cy="11" r="4" fill="#fff"/>
       </svg>`;

  return L.divIcon({
    className: '',
    html: svg,
    iconSize:      isOrigin ? [22, 22] : [22, 30],
    iconAnchor:    isOrigin ? [11, 11] : [11, 30],
    tooltipAnchor: [12, isOrigin ? -11 : -15],
  });
}

// ── Route geometry helpers ─────────────────────────────────────────────────

/**
 * Builds an array of cumulative Euclidean distances between consecutive
 * coordinate pairs.  The values are in lat/lng units — sufficient for a
 * constant-speed animation; geographic accuracy is not required here.
 */
function buildCumulativeDistances(coords: [number, number][]): number[] {
  const dists: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    const [lat1, lng1] = coords[i - 1];
    const [lat2, lng2] = coords[i];
    dists.push(dists[i - 1] + Math.hypot(lat2 - lat1, lng2 - lng1));
  }
  return dists;
}

/**
 * Returns the route prefix (start → interpolated point at targetDist) as a
 * coordinate array.  Uses a binary search to locate the containing segment,
 * then linearly interpolates within it.
 */
function getRouteSlice(
  coords: [number, number][],
  cumDist: number[],
  targetDist: number,
): [number, number][] {
  let lo = 0;
  let hi = coords.length - 1;

  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumDist[mid] <= targetDist) lo = mid;
    else hi = mid;
  }

  const segLen = cumDist[lo + 1] - cumDist[lo];
  const t = segLen === 0 ? 0 : (targetDist - cumDist[lo]) / segLen;

  const [lat1, lng1] = coords[lo];
  const [lat2, lng2] = coords[lo + 1] ?? coords[lo];
  const interp: [number, number] = [lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t];

  return [...coords.slice(0, lo + 1), interp];
}

// ── Easing ─────────────────────────────────────────────────────────────────

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// ── RouteAnimator ──────────────────────────────────────────────────────────
// Null-rendering component — lives inside MapContainer so it can call
// useMap().  Manages route reveal animation entirely via imperative Leaflet
// calls; zero React re-renders during animation.

const HEAD_ICON = L.divIcon({
  className: '',
  html: '<div class="route-head"><div class="route-head__pulse"></div></div>',
  iconSize:   [18, 18],
  iconAnchor: [9, 9],
});

const ANIM_DURATION_MS = 2000;

function RouteAnimator({ routeCoordinates }: { routeCoordinates: [number, number][] }) {
  const map        = useMap();
  const rafRef     = useRef<number>(0);
  const layersRef  = useRef<L.Layer[]>([]);

  useEffect(() => {
    // ── Cleanup previous animation ────────────────────────────────────────
    cancelAnimationFrame(rafRef.current);
    layersRef.current.forEach((l) => { try { l.remove(); } catch { /* already gone */ } });
    layersRef.current = [];

    if (routeCoordinates.length < 2) return;

    // ── Pre-compute geometry ──────────────────────────────────────────────
    const cumDist   = buildCumulativeDistances(routeCoordinates);
    const totalDist = cumDist[cumDist.length - 1];

    // ── Create imperative Leaflet layers ──────────────────────────────────
    const glowLine = L.polyline([], {
      color: '#9333ea', weight: 10, opacity: 0.25,
    }).addTo(map);

    const crispLine = L.polyline([], {
      color: '#c084fc', weight: 3.5, opacity: 0.92,
    }).addTo(map);

    const headMarker = L.marker(routeCoordinates[0], {
      icon: HEAD_ICON,
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(map);

    layersRef.current = [glowLine, crispLine, headMarker];

    // ── rAF animation loop ────────────────────────────────────────────────
    const startTime = performance.now();

    function frame(now: number) {
      const rawT = Math.min((now - startTime) / ANIM_DURATION_MS, 1);
      const t    = easeInOut(rawT);

      const slice    = getRouteSlice(routeCoordinates, cumDist, t * totalDist);
      const headPos  = slice[slice.length - 1] as L.LatLngExpression;

      glowLine.setLatLngs(slice);
      crispLine.setLatLngs(slice);
      headMarker.setLatLng(headPos);

      if (rawT < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        // Fade the head marker out once the line is fully drawn
        const el = headMarker.getElement();
        if (el) {
          el.style.transition = 'opacity 0.7s ease';
          el.style.opacity    = '0';
        }
      }
    }

    rafRef.current = requestAnimationFrame(frame);

    // ── Cleanup on unmount / next route ──────────────────────────────────
    return () => {
      cancelAnimationFrame(rafRef.current);
      layersRef.current.forEach((l) => { try { l.remove(); } catch { /* already gone */ } });
      layersRef.current = [];
    };
  }, [map, routeCoordinates]);

  return null;
}

// ── MapController ──────────────────────────────────────────────────────────

interface MapControllerProps {
  markers: RouteMarker[];
  routeCoordinates: [number, number][];
}

function MapController({ markers, routeCoordinates }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (routeCoordinates.length >= 2) {
      const bounds = L.latLngBounds(routeCoordinates);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    } else if (markers.length >= 2) {
      const bounds = L.latLngBounds(markers.map((m) => m.position));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    } else if (markers.length === 1) {
      const [lat, lng] = markers[0].position;
      map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: 0.8 });
    }
  }, [map, markers, routeCoordinates]);

  return null;
}

// ── Props ──────────────────────────────────────────────────────────────────

export interface MapViewProps {
  markers?: RouteMarker[];
  routeCoordinates?: [number, number][];
  routeInfo?: RouteInfoPanelProps;
}

// ── Component ──────────────────────────────────────────────────────────────

function MapView({ markers = [], routeCoordinates = [], routeInfo }: MapViewProps) {
  return (
    <div className="map-view">
      <MapContainer
        center={[20, 0]}
        zoom={3}
        className="map-view__container"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />

        {/* Endpoint markers — sit above the animated polyline layers */}
        {markers.map((marker) => (
          <Marker
            key={marker.type}
            position={marker.position}
            icon={makeDivIcon(marker.type)}
            title={marker.label}
          />
        ))}

        {/*
          RouteAnimator draws the animated glow + crisp lines and the moving
          head imperatively.  It replaces the static <Polyline> pair so that
          every new routeCoordinates prop triggers a fresh reveal animation.
        */}
        <RouteAnimator routeCoordinates={routeCoordinates} />

        {/* Handles fitBounds / flyTo imperatively inside the map context */}
        <MapController markers={markers} routeCoordinates={routeCoordinates} />
      </MapContainer>

      {routeInfo && <RouteInfoPanel {...routeInfo} />}
    </div>
  );
}

export default MapView;
