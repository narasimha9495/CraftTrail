import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import './JourneyStamps.css';

/**
 * Passport-style stamp collection. Three ways to "collect" India's crafts:
 *   crafts     — every distinct craft tradition
 *   traditions — only GI-tagged crafts (the protected heritage)
 *   states     — the craft states
 * A stamp is earned when the traveller has VISITED an artisan matching it.
 * Everything computes from the live cluster list against `visited`.
 */
export default function JourneyStamps({ visited = [] }) {
  const [clusters, setClusters] = useState([]);
  const [tab, setTab] = useState('crafts');

  useEffect(() => {
    api('/clusters')
      .then((d) => setClusters(d.clusters || d || []))
      .catch(() => setClusters([]));
  }, []);

  if (!clusters.length) return null;

  // What the traveller has actually visited
  const visitedCrafts = new Set(visited.map((a) => a.craft).filter(Boolean));
  const visitedStates = new Set(visited.map((a) => a.state).filter(Boolean));

  // The full sets to collect against, from the live cluster registry
  const allCrafts = [...new Set(clusters.map((c) => c.craft).filter(Boolean))].sort();
  const allGi = [...new Set(clusters.map((c) => c.giTag).filter(Boolean))].sort();
  const allStates = [...new Set(clusters.map((c) => c.state).filter(Boolean))].sort();

  // GI tag → its craft, so we can check a GI stamp against visited crafts
  const giToCraft = {};
  clusters.forEach((c) => { if (c.giTag) giToCraft[c.giTag] = c.craft; });

  const TABS = {
    crafts: {
      label: 'Crafts',
      items: allCrafts,
      earned: (craft) => visitedCrafts.has(craft),
    },
    traditions: {
      label: 'GI Traditions',
      items: allGi,
      earned: (gi) => visitedCrafts.has(giToCraft[gi]),
    },
    states: {
      label: 'States',
      items: allStates,
      earned: (state) => visitedStates.has(state),
    },
  };

  const active = TABS[tab];
  const collected = active.items.filter(active.earned).length;
  const total = active.items.length;

  return (
    <section className="stamps">
      <header className="stamps__head">
        <div>
          <h3 className="stamps__title">Your Craft Passport</h3>
          <p className="stamps__sub">
            Every artisan you visit stamps a tradition into your journey.
          </p>
        </div>
        <div className="stamps__count">
          <span className="stamps__count-num">{collected}</span>
          <span className="stamps__count-of">of {total}</span>
        </div>
      </header>

      <div className="stamps__tabs">
        {Object.entries(TABS).map(([key, t]) => (
          <button
            key={key}
            className={`stamps__tab ${tab === key ? 'is-on' : ''}`}
            onClick={() => setTab(key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={`stamps__grid stamps__grid--${tab}`}>
        {active.items.map((item) => {
          const earned = active.earned(item);
          return (
            <div
              key={item}
              className={`stamp ${earned ? 'is-earned' : 'is-locked'}`}
              title={earned ? `Collected: ${item}` : `Not yet visited: ${item}`}
            >
              <span className="stamp__seal">{earned ? '✦' : ''}</span>
              <span className="stamp__name">{item}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}