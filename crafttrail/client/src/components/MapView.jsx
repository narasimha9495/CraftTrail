import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../lib/theme.jsx';
import './MapView.css';

const INDIA_BOUNDS = L.latLngBounds(
  L.latLng(6.4627, 68.1097),
  L.latLng(35.5133, 97.3953)
);

function clusterIcon({ significance, availableNow, active }) {
  const base = 28 + (significance || 6) * 1.4;
  const h = Math.round(base);
  const w = Math.round(h * 0.675);
  const color = availableNow > 0 ? '#2a9d8f' : '#e9c46a';
  const shadow = active
    ? 'drop-shadow(0 3px 8px rgba(0,0,0,0.6))'
    : 'drop-shadow(0 2px 5px rgba(0,0,0,0.4))';
  return L.divIcon({
    className: 'pin-wrap',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 27 40"
            style="filter:${shadow};cursor:pointer">
            <path d="M13.5 0C6.04 0 0 6.04 0 13.5c0 9.5 13.5 26.5 13.5 26.5S27 23 27 13.5C27 6.04 20.96 0 13.5 0z"
              fill="${color}"/>
            <circle cx="13.5" cy="13.5" r="5.5" fill="white" opacity="0.9"/>
          </svg>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h],
  });
}

function artisanIcon({ availability, active, stateMode }) {
  const color = availability === 'AVAILABLE' ? '#2a9d8f'
    : availability === 'UNAVAILABLE' ? '#999'
    : '#e9c46a';
  const h = stateMode ? 40 : 30;
  const w = stateMode ? 27 : 20;
  const shadow = active ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.55))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))';
  return L.divIcon({
    className: 'pin-wrap',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 27 40"
            style="filter:${shadow};cursor:pointer">
            <path d="M13.5 0C6.04 0 0 6.04 0 13.5c0 9.5 13.5 26.5 13.5 26.5S27 23 27 13.5C27 6.04 20.96 0 13.5 0z"
              fill="${color}"/>
            <circle cx="13.5" cy="13.5" r="5.5" fill="white" opacity="0.9"/>
          </svg>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h],
  });
}

const originIcon = () =>
  L.divIcon({
    className: 'pin-wrap',
    html: '<span class="origin"><span class="origin__cross"></span></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const userLocationIcon = () =>
  L.divIcon({
    className: 'pin-wrap',
    html: `<span class="uloc">
             <span class="uloc__core"></span>
             <span class="uloc__ring"></span>
             <span class="uloc__ring uloc__ring--2"></span>
           </span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

function MapController({ fitClusters, points, origin }) {
  const map = useMap();

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [map]);

  const pointsKey = points.map((p) => p.join(',')).join('|');

  useEffect(() => {
    if (fitClusters) {
      if (!points.length) return;
      const t = setTimeout(() => {
        map.invalidateSize();
        map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 9, animate: true });
      }, 250);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        map.invalidateSize();
        map.flyTo([origin.lat, origin.lng], 5, { duration: 0.8 });
      }, 120);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line
  }, [fitClusters, pointsKey, origin.lat, origin.lng, map]);

  return null;
}

export default function MapView({
  origin,
  radiusKm,
  clusters = [],
  standaloneArtisans = [],
  activeId,
  onSelect,
  showArtisans = false,
  onArtisan,
  userLocation = null,
  portraitMobile = false,
  fitClusters = false,
  stateMode = false,
}) {
  const { isDark } = useTheme();
  const tiles = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const coordsOf = (c) => c.coordinates || c.location?.coordinates || null;

  const points = clusters
    .map(coordsOf)
    .filter(Boolean)
    .map(([lng, lat]) => [lat, lng]);

  return (
    <MapContainer
      center={[origin.lat, origin.lng]}
      zoom={5}
      scrollWheelZoom
      className={`map ${portraitMobile ? 'map--portrait' : ''}`}
      zoomControl={false}
      minZoom={4}
      maxZoom={16}
      maxBounds={INDIA_BOUNDS}
      maxBoundsViscosity={0.5}
    >
      <TileLayer key={isDark ? 'd' : 'l'} url={tiles} attribution="&copy; OpenStreetMap contributors &copy; CARTO" />

      <MapController fitClusters={fitClusters} points={points} origin={origin} />

      {!fitClusters && (
        <>
          <Circle
            center={[origin.lat, origin.lng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: 'var(--ink)', weight: 1, opacity: 0.2, fillOpacity: 0.02 }}
          />
          <Marker position={[origin.lat, origin.lng]} icon={originIcon()} />
        </>
      )}

      {userLocation && INDIA_BOUNDS.contains([userLocation.lat, userLocation.lng]) && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon()}>
          <Popup>
            <strong style={{ fontFamily: 'var(--display)', fontSize: '0.9rem' }}>You are here</strong>
            <div style={{ fontSize: '.75rem', color: 'var(--ink-mid)', marginTop: 2 }}>
              Your current location
            </div>
          </Popup>
        </Marker>
      )}

      {clusters.map((c) => {
        const co = coordsOf(c);
        if (!co) return null;
        const id = c.id || c._id;
        return (
          <Marker
            key={id}
            position={[co[1], co[0]]}
            icon={clusterIcon({ significance: c.significance, availableNow: c.availableNow, active: activeId === id })}
            eventHandlers={{ click: () => onSelect?.(id) }}
          >
            <Popup>
              <strong style={{ fontFamily: 'var(--display)', fontSize: '1rem' }}>{c.name}</strong>
              <div style={{ fontSize: '.8rem', color: 'var(--ink-mid)', marginTop: 2 }}>
                {c.craft}{c.distanceKm != null ? ` · ${c.distanceKm} km` : ''}
              </div>
              {c.district && (
                <div style={{ fontSize: '.75rem', color: 'var(--ink-dim)', marginTop: 6 }}>
                  {c.district}{c.state ? `, ${c.state}` : ''}
                </div>
              )}
            </Popup>
          </Marker>
        );
      })}

      {/* Standalone artisans (those not inside a cluster) */}
      {standaloneArtisans
        .filter((a) => {
          const co = a.coordinates || a.location?.coordinates;
          return co && co.length === 2;
        })
        .map((a) => {
          const co = a.coordinates || a.location?.coordinates;
          return (
            <Marker
              key={a.id || a._id}
              position={[co[1], co[0]]}
              icon={artisanIcon({ availability: a.availability?.state || a.availability, active: activeId === (a.id || a._id), stateMode })}
              eventHandlers={{ click: () => onArtisan?.(a.id || a._id) }}
            >
              <Popup>
                <strong style={{ fontSize: '.92rem' }}>{a.name}</strong>
                <div style={{ fontSize: '.78rem', color: 'var(--ink-mid)', marginTop: 2 }}>{a.craft}</div>
                <div style={{ fontSize: '.74rem', color: 'var(--ink-dim)', marginTop: 2 }}>{a.district}, {a.state}</div>
                {co && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${co[1]},${co[0]}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '.74rem', color: 'var(--accent)', display: 'block', marginTop: 6 }}
                  >
                    Get directions ↗
                  </a>
                )}
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}
