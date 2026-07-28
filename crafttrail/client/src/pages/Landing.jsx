import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MapView from '../components/MapView.jsx';
import StateDetailModal from '../components/StateDetailModal.jsx';
import RagChatbot from '../components/RagChatbot.jsx';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import { CITIES, FACTS, TIERS } from '../lib/constants.js';
import './Landing.css';

const STATES = [
  { key: 'telangana', name: 'Telangana',        craft: 'Pochampally Ikat & Gadwal sarees',     swatch: 'ikat' },
  { key: 'ap',        name: 'Andhra Pradesh',    craft: 'Kalamkari & Kondapalli toys',           swatch: 'kalamkari' },
  { key: 'rajasthan', name: 'Rajasthan',         craft: 'Block printing & Blue pottery',         swatch: 'blockprint' },
  { key: 'gujarat',   name: 'Gujarat',           craft: 'Bandhani & Patola weaving',             swatch: 'bandhani' },
  { key: 'karnataka', name: 'Karnataka',         craft: 'Mysore silk & Channapatna toys',        swatch: 'silk' },
  { key: 'tn',        name: 'Tamil Nadu',        craft: 'Kanchipuram silk & Bronze casting',     swatch: 'bronze' },
  { key: 'wb',        name: 'West Bengal',       craft: 'Kantha embroidery & Terracotta',        swatch: 'kantha' },
  { key: 'odisha',    name: 'Odisha',            craft: 'Pattachitra & Sambalpuri Ikat',         swatch: 'pattachitra' },
  { key: 'up',        name: 'Uttar Pradesh',     craft: 'Banarasi silk & Chikankari',            swatch: 'chikankari' },
  { key: 'mp',        name: 'Madhya Pradesh',    craft: 'Gond art & Chanderi weaving',           swatch: 'gond' },
  { key: 'bihar',     name: 'Bihar',             craft: 'Madhubani painting & Sikki grass craft',swatch: 'madhubani' },
  { key: 'assam',     name: 'Assam',             craft: 'Muga silk & Bamboo crafts',             swatch: 'muga' },
  { key: 'kerala',    name: 'Kerala',            craft: 'Coir weaving & Aranmula mirrors',       swatch: 'coir' },
  { key: 'jk',        name: 'Jammu & Kashmir',   craft: 'Pashmina & Papier-mâché',               swatch: 'pashmina' },
  { key: 'punjab',    name: 'Punjab',            craft: 'Phulkari embroidery & Punjabi Jutti',   swatch: 'phulkari' },
  { key: 'hp',        name: 'Himachal Pradesh',  craft: 'Kullu shawls & Chamba Rumal',           swatch: 'kullu' },
];

function ShopByState({ user, onStateClick }) {
  const loop = [...STATES, ...STATES];
  return (
    <section className="lp__states">
      <div className="shell lp__statesHead">
        <span className="eyebrow">Shop by state</span>
        <h2>Every region weaves a different story.</h2>
        <p className="lp__states-motiv">
          From the indigo block-prints of Rajasthan to the gold-threaded silks of Tamil Nadu,
          each Indian state carries craft traditions passed down for centuries. Hover to feel
          the colour of each region — tap one to step inside its heritage.
        </p>
        {user ? (
          <div className="lp__states-unlocked">
            <span className="lp__unlock-badge">✅ Logged in — Click any state to explore heritage + AI chatbot</span>
          </div>
        ) : (
          <p className="lp__lede">🔒 Sign in to open any state's full heritage guide and AI chatbot.</p>
        )}
      </div>

      <div className="states-viewport">
        <div className="states-track">
          {loop.map((s, i) => (
            <article
              className={`state-card swatch--${s.swatch} ${user ? 'is-unlocked' : ''}`}
              key={`${s.key}-${i}`}
              onClick={() => onStateClick(s.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onStateClick(s.key)}
              aria-label={`Explore ${s.name} heritage`}
            >
              <div className="state-card__pattern" aria-hidden="true" />
              <div className="state-card__label">
                <span className="state-card__name">{s.name}</span>
                <span className="state-card__craft">{s.craft}</span>
              </div>
              {user ? (
                <div className="state-card__ai-hint" aria-hidden="true">🤖 AI Guide</div>
              ) : (
                <div className="state-card__login-hint" aria-hidden="true">🔒 Sign in to explore</div>
              )}
            </article>
          ))}
        </div>
      </div>

      <div className="shell lp__statesfoot">
        <div className="lp__statesfoot-item">
          <strong>16</strong>
          <span>craft-rich states, each with its own signature tradition</span>
        </div>
        <div className="lp__statesfoot-item">
          <strong>28+</strong>
          <span>documented craft clusters mapped and verified</span>
        </div>
        <div className="lp__statesfoot-item">
          <strong>100s</strong>
          <span>of years of unbroken heritage in a single village</span>
        </div>
      </div>
    </section>
  );
}

function FloatingRagBot() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 800, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
      {open && (
        <div style={{ width: 360, height: 520, borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.28)' }}>
          <RagChatbot />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close CraftBot' : 'Open CraftBot'}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg,#c0492e,#8f2c1b)',
            border: 'none', cursor: 'pointer', color: '#fff',
            fontSize: open ? '1.4rem' : '1.6rem',
            boxShadow: '0 4px 20px rgba(192,73,46,0.45)',
            display: 'grid', placeItems: 'center',
          }}
        >
          {open ? '×' : '🤖'}
        </button>
        <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888' }}>
          CraftBot AI
        </span>
      </div>
    </div>
  );
}

function LoginPromptModal({ stateName, onClose, onContinue }) {
  return (
    <div className="lpm__overlay" onClick={onClose}>
      <div className="lpm__box" onClick={e => e.stopPropagation()}>
        <button className="lpm__close" onClick={onClose}>×</button>
        <div className="lpm__icon">🔐</div>
        <h3>Sign in to explore {stateName}</h3>
        <p>Discover {stateName}'s heritage crafts, culture, GI-tagged products, and chat with our AI guide — all after a quick sign-in.</p>
        <div className="lpm__actions">
          <button className="btn btn-primary lpm__wide" onClick={onContinue}>
            Sign in &amp; explore {stateName} →
          </button>
          <Link className="btn lpm__wide" to="/signup" onClick={onClose}>
            Create free account
          </Link>
        </div>
        <p className="lpm__fine">Free account. Takes 30 seconds. No spam ever.</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [city] = useState(CITIES[0]);
  const [clusters, setClusters] = useState([]);
  const [crafts, setCrafts] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loginPrompt, setLoginPrompt] = useState(null);
  const [activeState, setActiveState] = useState(null);

  useEffect(() => {
    api.discover({ lat: city.lat, lng: city.lng, radiusKm: 150 })
      .then((d) => setClusters(d.clusters))
      .catch(() => setClusters([]));
    api.crafts().then((d) => setCrafts(d.crafts)).catch(() => {});
  }, [city]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  useEffect(() => {
    if (!user) return;
    const pending = sessionStorage.getItem('crafttrail_pending_state');
    if (pending) {
      sessionStorage.removeItem('crafttrail_pending_state');
      setActiveState(pending);
    }
  }, [user]);

  const handleStateClick = useCallback((stateKey) => {
    if (user) {
      setActiveState(stateKey);
    } else {
      const s = STATES.find(s => s.key === stateKey);
      setLoginPrompt({ key: stateKey, name: s?.name || stateKey });
    }
  }, [user]);

  const handleLoginContinue = useCallback(() => {
    if (!loginPrompt) return;
    sessionStorage.setItem('crafttrail_pending_state', loginPrompt.key);
    navigate('/signin', { state: { from: '/' } });
    setLoginPrompt(null);
  }, [loginPrompt, navigate]);

  if (loading) return null;

  return (
    <div className="lp">

      {/* ── SLIDE 1 — Hero ── */}
      <section className="lp__hero">
        <div className="lp__copy">
          <span className="eyebrow">India's craft clusters, made findable</span>
          <h1>
            You are thirty kilometres from a village that has been
            printing cloth for <span className="script">three hundred years</span>.
          </h1>
          <p className="lp__sub">
            You have never heard of Bagru. That is not your fault — a search engine only
            finds what you can already name. CraftTrail shows you the craft villages around
            you, tells you who is verified, and lets you knock on the door.
          </p>
          <div className="lp__cta">
            {user ? (
              <>
                <Link className="btn btn-primary" to="/home">Explore craft clusters</Link>
                <Link className="btn lp__btn-ghost" to="/discover">Discover map</Link>
              </>
            ) : (
              <>
                <Link className="btn btn-primary" to="/signup">Create an account</Link>
                <Link className="btn lp__btn-ghost" to="/discover">Look around first</Link>
              </>
            )}
          </div>
          {!user && (
            <p className="lp__fine">
              Browsing needs no account. Booking a visit does — the artisan deserves to know
              who is coming.
            </p>
          )}
        </div>
        <div className="lp__scrollcue">
          <span>Scroll to explore</span>
          <span>↓</span>
        </div>
      </section>

      {/* ── Facts strip ── */}
      <section className="lp__facts">
        <div className="shell lp__factrow">
          {FACTS.map((f) => (
            <div className="fact" key={f.label}>
              <span className="fact__v">{f.value}</span>
              <span className="fact__l">{f.label}</span>
            </div>
          ))}
        </div>
        <p className="shell lp__factnote">
          The Government of India issues Pehchan cards, protects 500+ GI products and maps
          744 clusters. None of it is exposed to the people who would visit.
        </p>
      </section>

      {/* ── SLIDE 2 — Shop by state ── */}
      <ShopByState user={user} onStateClick={handleStateClick} />

      {/* ── SLIDE 3 — Map + artisan info ── */}
      <section className="lp__mapsection">
        <div className="shell lp__mapsectionHead">
          <span className="eyebrow">What's actually near you</span>
          <h2>The map is real, not decoration.</h2>
          <p className="lp__lede">
            Every pin is a documented craft cluster within reach of {city.name}.
            {userLocation && ' 🔵 The blue dot is your live location.'}
          </p>
        </div>

        <div className="shell lp__mapgrid">
          <div className="lp__mapinfo">
            <div className="lp__infocard">
              <span className="lp__infonum">{clusters.length || '—'}</span>
              <span className="lp__infolabel">craft clusters within 150 km</span>
            </div>
            <div className="lp__infocard">
              <span className="lp__infonum">🧭</span>
              <span className="lp__infolabel">Every pin is a real, documented village — not a guess</span>
            </div>
            <div className="lp__infocard">
              <span className="lp__infonum">📍</span>
              <span className="lp__infolabel">Turn on location to see what's closest to you right now</span>
            </div>
          </div>

          <div className="lp__map card">
            <MapView
              origin={{ lat: city.lat, lng: city.lng }}
              radiusKm={150}
              clusters={clusters}
              activeId={null}
              onSelect={() => {}}
              userLocation={userLocation}
            />
          </div>

          <div className="lp__mapinfo">
            <div className="lp__infocard">
              <span className="lp__infonum">🤝</span>
              <span className="lp__infolabel">Each artisan is verified against India's GI registry</span>
            </div>
            <div className="lp__infocard">
              <span className="lp__infonum">💬</span>
              <span className="lp__infolabel">Book a visit over WhatsApp — the channel they already use</span>
            </div>
            <div className="lp__infocard">
              <span className="lp__infonum">🎨</span>
              <span className="lp__infolabel">Discover crafts you'd never have known to search for</span>
            </div>
          </div>
        </div>
      </section>
      {/* ── SLIDE 4 — How trust works + artisan onboarding ── */}
      <section className="lp__slide4">
        <div className="shell">
          <div className="lp__s4head">
            <span className="eyebrow">How a badge is earned</span>
            <h2>Trust you can <span className="script">take apart</span>.</h2>
            <p className="lp__lede">
              Document OCR reads the Pehchan / GI / Udyam card, then checks the craft against
              the district it's registered to. Three layers, each with a ceiling the one below
              cannot break through — every profile shows you the reasoning, not a green tick.
            </p>
          </div>

          <div className="tiers">
            {TIERS.map((t, i) => (
              <article className="tier" key={t.key}>
                <span className="tier__cap mono">{t.ceilingAt}</span>
                <h3>{t.name}</h3>
                <p className="tier__detail">{t.detail}</p>
                <p className="tier__ceiling mono">{i < 2 ? t.ceiling : 'Real visits only.'}</p>
              </article>
            ))}
          </div>

          <div className="lp__s4artisan">
            <div className="lp__s4artisan-text">
              <span className="eyebrow">For cluster offices and NGOs</span>
              <h3 className="lp__s4artisan-h">Artisans never sign up.</h3>
              <p className="lp__lede">
                A block printer in Bagru is not going to manage a dashboard. Field records
                collected by NGOs and cluster offices are entered by state tourism staff, and
                availability arrives over WhatsApp — the channel artisans already use.
              </p>
            </div>
            <div className="lp__s4stats">
              <div className="lp__s4stat">
                <strong>95%</strong>
                <span>of every booking reaches the artisan</span>
              </div>
              <div className="lp__s4stat">
                <strong>5%</strong>
                <span>sustains the SHG that vouched for them</span>
              </div>
              <div className="lp__s4stat">
                <strong>0</strong>
                <span>apps an artisan has to install</span>
              </div>
            </div>
          </div>

          {crafts.length > 0 && (
            <div className="lp__s4crafts">
              <span className="eyebrow">Every tradition has a district — explore by craft</span>
              <div className="chips">
                {crafts.slice(0, 14).map((c) => (
                  <Link key={c} className="chip" to={`/discover?crafts=${encodeURIComponent(c)}`}>{c}</Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      {/* ── SLIDE 5 — Footer ── */}
      <footer className="lp__foot">
        <section>
      <div className="lp__cta-foot">
            <div className="lp__foot-top">
              <div>
                <p className="lp__brand">CraftTrail</p>
                <p className="lp__tagline">Connecting travellers with India's artisans — honestly and directly.</p>
              </div>
              <nav className="lp__foot-nav">
                <div className="lp__foot-col">
                  <span className="lp__foot-h">Explore</span>
                  <Link to="/discover">Discover map</Link>
                  <Link to="/plan">Plan a trip</Link>
                  {user && <Link to="/journey">My journey</Link>}
                </div>
                <div className="lp__foot-col">
                  <span className="lp__foot-h">Account</span>
                  {!user && <Link to="/signin">Log in</Link>}
                  {!user && <Link to="/signup">Create account</Link>}
                  {user && <Link to="/home">Home</Link>}
                </div>
                <div className="lp__foot-col">
                  <span className="lp__foot-h">About</span>
                  <a href="#trust">How trust works</a>
                  <a href="#artisans">For NGOs & clusters</a>
                </div>
              </nav>
            </div>
            <div className="lp__foot-bottom">
              <p>© {new Date().getFullYear()} CraftTrail. All rights reserved.</p>
              <p className="lp__foot-legal">
                Craft data sourced from public GI, Pehchan and Udyam records ·
                Made in India 🇮🇳
              </p>
            </div>
          </div>
      </section>
      </footer>

      {loginPrompt && (
        <LoginPromptModal
          stateName={loginPrompt.name}
          onClose={() => setLoginPrompt(null)}
          onContinue={handleLoginContinue}
        />
      )}
      {activeState && (
        <StateDetailModal stateKey={activeState} onClose={() => setActiveState(null)} />
      )}
      <FloatingRagBot />
    </div>
  );
}