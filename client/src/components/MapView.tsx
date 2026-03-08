import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// ── Types ──────────────────────────────────────────────────────────────────

/** A single pin to place on the map. */
export interface RouteMarker {
  /** [lat, lng] – matches Leaflet's LatLngTuple so no conversion needed. */
  position: [number, number];
  type: 'origin' | 'destination';
  /** Human-readable label from the geocoder, used as the native tooltip. */
  label: string;
}

// ── Custom DivIcons ────────────────────────────────────────────────────────
// Leaflet's default PNG icons break in Vite builds (missing asset paths).
// SVG-based DivIcons sidestep that entirely and match the purple/neon theme.

function makeDivIcon(type: 'origin' | 'destination'): L.DivIcon {
  const isOrigin = type === 'origin';

  const svg = isOrigin
    ? /* ring + dot */
      `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
         <circle cx="11" cy="11" r="9" fill="#9333ea" stroke="#c084fc" stroke-width="2"/>
         <circle cx="11" cy="11" r="3.5" fill="#fff"/>
       </svg>`
    : /* teardrop pin */
      `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" viewBox="0 0 22 30">
         <path d="M11 0C4.925 0 0 4.925 0 11c0 8.25 11 19 11 19S22 19.25 22 11C22 4.925 17.075 0 11 0z"
               fill="#a855f7" stroke="#c084fc" stroke-width="1.5"/>
         <circle cx="11" cy="11" r="4" fill="#fff"/>
       </svg>`;

  return L.divIcon({
    className: '',  // strip Leaflet's default white-box class
    html: svg,
    iconSize:   isOrigin ? [22, 22] : [22, 30],
    iconAnchor: isOrigin ? [11, 11] : [11, 30],  // anchor at center / pin tip
    tooltipAnchor: [12, isOrigin ? -11 : -15],
  });
}

// ── MapController ──────────────────────────────────────────────────────────
// Lives *inside* MapContainer so it can call useMap(). Fits the viewport to
// the two markers whenever they change. Renders nothing itself.

function MapController({ markers }: { markers: RouteMarker[] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length < 2) return;

    const bounds = L.latLngBounds(markers.map((m) => m.position));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
  }, [map, markers]);

  return null;
}

// ── Props ──────────────────────────────────────────────────────────────────

export interface MapViewProps {
  markers?: RouteMarker[];
}

// ── Component ──────────────────────────────────────────────────────────────

function MapView({ markers = [] }: MapViewProps) {
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

        {markers.map((marker) => (
          <Marker
            key={marker.type}
            position={marker.position}
            icon={makeDivIcon(marker.type)}
            title={marker.label}
          />
        ))}

        {/* Handles fitBounds imperatively inside the map context */}
        <MapController markers={markers} />
      </MapContainer>
    </div>
  );
}

export default MapView;
