import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../lib/api.js';
import { CITIES } from '../lib/constants.js';
import './Plan.css';

const INDIA_CENTER = [22.5, 82.5];

// Haversine distance in km between two [lng, lat] points.
function distKm(a, b) {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const la1 = (a[1] * Math.PI) / 180;
  const la2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// Greedy nearest-neighbour ordering from a start point.
function planRoute(start, stops) {
  const remaining = [...stops];
  const ordered = [];
  let current = start; // [lng, lat]
  while (remaining.length) {
    let bestI = 0;
    let bestD = Infinity;
    remaining.forEach((s, i) => {
      const d = distKm(current, s.coordinates);
      if (d < bestD) { bestD = d; bestI = i; }
    });
    const next = remaining.splice(bestI, 1)[0];
    ordered.push({ ...next, legKm: bestD });
    current = next.coordinates;
  }
  return ordered;
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(points.map((p) => [p[1], p[0]]), { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

export default function Plan() {
  const [clusters, setClusters] = useState([]);
  const [selected, setSelected] = useState([]); // cluster ids
  const [startCity, setStartCity] = useState(CITIES[0]);
  const [route, setRoute] = useState(null);

  useEffect(() => {
    api('/clusters').then((d) => setClusters(d.clusters || d || [])).catch(() => setClusters([]));
  }, []);

  const byState = useMemo(() => {
    const m = {};
    clusters.forEach((c) => { (m[c.state] ||= []).push(c); });
    return m;
  }, [clusters]);

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const build = () => {
    const stops = clusters.filter((c) => selected.includes(c._id));
    if (!stops.length) return;
    const start = [startCity.lng, startCity.lat];
    setRoute(planRoute(start, stops));
  };

  const totalKm = route ? route.reduce((s, r) => s + r.legKm, 0) : 0;
  const linePoints = route
    ? [[startCity.lat, startCity.lng], ...route.map((r) => [r.coordinates[1], r.coordinates[0]])]
    : [];

  return (
    <div className="plan shell">
      <header className="plan__head">
        <span className="eyebrow">Plan your craft trail</span>
        <h1>Pick the villages. We'll order the trip.</h1>
        <p className="plan__sub">
          Choose the craft clusters you want to visit and a starting city — CraftTrail
          plots them into a sensible route across India.
        </p>
      </header>

      <div className="plan__controls">
        <label>
          Starting from
          <select
            className="input"
            value={startCity.name}
            onChange={(e) => setStartCity(CITIES.find((c) => c.name === e.target.value))}
          >
            {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </label>
        <button className="btn btn-primary" onClick={build} disabled={!selected.length}>
          Build my route ({selected.length})
        </button>
      </div>

      <div className="plan__body">
        <div className="plan__picker">
          {Object.entries(byState).map(([state, list]) => (
            <div key={state} className="plan__state">
              <h3 className="plan__state-name">{state}</h3>
              {list.map((c) => (
                <button
                  key={c._id}
                  className={`plan__chip ${selected.includes(c._id) ? 'is-on' : ''}`}
                  onClick={() => toggle(c._id)}
                >
                  {c.name} · {c.craft}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="plan__map-wrap">
          <MapContainer center={INDIA_CENTER} zoom={5} className="plan__map" scrollWheelZoom>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            {route && <FitBounds points={[[startCity.lng, startCity.lat], ...route.map((r) => r.coordinates)]} />}
            {route && linePoints.length > 1 && (
              <Polyline positions={linePoints} pathOptions={{ color: '#a96b45', weight: 3, dashArray: '6 6' }} />
            )}
            {route?.map((r, i) => (
              <CircleMarker key={r._id} center={[r.coordinates[1], r.coordinates[0]]} radius={12}
                pathOptions={{ color: '#a96b45', fillColor: '#c4906c', fillOpacity: 0.9 }}>
                <Popup><strong>{i + 1}. {r.name}</strong><br />{r.craft} · {r.legKm} km</Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {route && (
        <div className="plan__itinerary">
          <h3>Your route · {totalKm} km total</h3>
          <ol>
            <li className="plan__start">Start: {startCity.name}</li>
            {route.map((r, i) => (
              <li key={r._id}>
                <strong>{r.name}</strong> — {r.craft}
                <span className="plan__leg">+{r.legKm} km</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}