import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../lib/api.js';
import { CITIES } from '../lib/constants.js';
import './Plan.css';

const INDIA_CENTER = [22.5, 82.5];
const INDIA_BOUNDS = [[6.4, 68.1], [35.5, 97.4]];

// Straight-line km, used only to decide the visiting order (fast, no network).
function distKm(a, b) {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const la1 = (a[1] * Math.PI) / 180;
  const la2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Greedy nearest-neighbour ordering from the start point.
function orderStops(start, stops) {
  const remaining = [...stops];
  const ordered = [];
  let current = start; // [lng, lat]
  while (remaining.length) {
    let bestI = 0, bestD = Infinity;
    remaining.forEach((s, i) => {
      const d = distKm(current, s.coordinates);
      if (d < bestD) { bestD = d; bestI = i; }
    });
    const next = remaining.splice(bestI, 1)[0];
    ordered.push(next);
    current = next.coordinates;
  }
  return ordered;
}

// Ask OSRM for the real driving route through all points in order.
// Returns { line: [[lat,lng]...], km, mins } or null on failure.
async function fetchRoad(points /* [lng,lat] in order */) {
  const coords = points.map((p) => `${p[0]},${p[1]}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.routes?.length) return null;
    const r = data.routes[0];
    return {
      line: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      km: Math.round(r.distance / 1000),
      mins: Math.round(r.duration / 60),
    };
  } catch {
    return null;
  }
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
    if (points.length > 1) {
      map.fitBounds(points.map((p) => [p[1], p[0]]), { padding: [40, 40] });
    } else {
      map.setView(INDIA_CENTER, 5);
    }
  }, [points, map]);
  return null;
}

export default function Plan() {
  const [clusters, setClusters] = useState([]);
  const [selected, setSelected] = useState([]);
  const [startCity, setStartCity] = useState(CITIES[0]);
  const [route, setRoute] = useState(null);   // ordered stops
  const [road, setRoad] = useState(null);     // { line, km, mins }
  const [loading, setLoading] = useState(false);

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

  const build = async () => {
    // pull coordinates up from location.coordinates so the rest is simple
    const stops = clusters
      .filter((c) => selected.includes(c._id))
      .map((c) => ({ ...c, coordinates: c.location.coordinates }));
    if (!stops.length) return;

    setLoading(true);
    setRoad(null);
    const start = [startCity.lng, startCity.lat];
    const ordered = orderStops(start, stops);
    setRoute(ordered);

    const points = [start, ...ordered.map((s) => s.coordinates)];
    const r = await fetchRoad(points);
    setRoad(r);
    setLoading(false);
  };

  const fitPoints = route
    ? [[startCity.lng, startCity.lat], ...route.map((r) => r.coordinates)]
    : [];

  return (
    <div className="plan shell">
      <header className="plan__head">
        <span className="eyebrow">Plan your craft trail</span>
        <h1>Pick the villages. We'll order the trip.</h1>
        <p className="plan__sub">
          Choose the craft clusters you want to visit and a starting city — CraftTrail
          plots them into a real driving route across India.
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
        <button className="btn btn-primary" onClick={build} disabled={!selected.length || loading}>
          {loading ? 'Building…' : `Build my route (${selected.length})`}
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
          <MapContainer
            center={INDIA_CENTER}
            zoom={5}
            minZoom={4}
            maxBounds={INDIA_BOUNDS}
            maxBoundsViscosity={1.0}
            className="plan__map"
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <FitBounds points={fitPoints} />
            {road?.line && (
              <Polyline positions={road.line} pathOptions={{ color: '#a96b45', weight: 4, opacity: 0.85 }} />
            )}
            {route?.map((r, i) => (
              <CircleMarker
                key={r._id}
                center={[r.coordinates[1], r.coordinates[0]]}
                radius={13}
                pathOptions={{ color: '#a96b45', fillColor: '#c4906c', fillOpacity: 0.9 }}
              >
                <Popup>
                  <strong>{i + 1}. {r.name}</strong><br />
                  {r.craft}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {route && (
        <div className="plan__itinerary">
          <h3>
            Your route
            {road && ` · ${road.km} km by road · about ${Math.floor(road.mins / 60)}h ${road.mins % 60}m driving`}
          </h3>
          <ol>
            <li className="plan__start">Start: {startCity.name}</li>
            {route.map((r, i) => (
              <li key={r._id}>
                <span><strong>{i + 1}. {r.name}</strong> — {r.craft}</span>
                <span className="plan__leg">{r.district}, {r.state}</span>
              </li>
            ))}
          </ol>
          {!road && !loading && (
            <p className="plan__note">Couldn't reach the routing service — showing stop order only.</p>
          )}
        </div>
      )}
    </div>
  );
}