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
  const size = 18 + (significance || 6) * 1.6;
  const tone = availableNow > 0 ? 'verdigris' : 'haldi';
  return L.divIcon({
    className: 'pin-wrap',
    html: `<span class="pin pin--${tone} ${active ? 'is-active' : ''}" style="--s:${size}px">
             <span class="pin__core"></span>
             ${availableNow > 0 ? '<span class="pin__ring"></span>' : ''}
           </span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function artisanIcon({ availability, active }) {
  const tone = availability === 'AVAILABLE' ? 'verdigris' : availability === 'UNAVAILABLE' ? 'dim' : 'haldi';
  return L.divIcon({
    className: 'pin-wrap',
    html: `<span class="apin apin--${tone} ${active ? 'is-active' : ''}"></span>`,
    iconSize: [11, 11],
    iconAnchor: [5.5, 5.5],
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
  activeId,
  onSelect,
  showArtisans = false,
  onArtisan,
  userLocation = null,
  portraitMobile = false,
  fitClusters = false,
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

      {showArtisans &&
        clusters.flatMap((c) =>
          (c.artisans || [])
            .filter((a) => a.coordinates)
            .map((a) => (
              <Marker
                key={a.id}
                position={[a.coordinates[1], a.coordinates[0]]}
                icon={artisanIcon({ availability: a.availability, active: activeId === a.id })}
                eventHandlers={{ click: () => onArtisan?.(a.id) }}
              >
                <Popup>
                  <strong style={{ fontSize: '.92rem' }}>{a.name}</strong>
                  <div style={{ fontSize: '.75rem', color: 'var(--ink-dim)', marginTop: 3 }}>
                    {a.craft} · trust {a.trustScore}/100
                  </div>
                </Popup>
              </Marker>
            ))
        )}
    </MapContainer>
  );
}
