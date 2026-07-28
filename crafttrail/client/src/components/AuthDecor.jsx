import './AuthDecor.css';

/**
 * Scattered, gently-floating craft motifs for the auth pages.
 * Purely decorative — sits behind the form, no interaction.
 */
export default function AuthDecor() {
  return (
    <div className="authdecor" aria-hidden="true">
      {/* pottery */}
      <svg className="authdecor__item ad--1" viewBox="0 0 60 60">
        <path d="M20 20 Q30 12 40 20 L42 40 Q30 50 18 40 Z" fill="none" stroke="currentColor" strokeWidth="2"/>
        <ellipse cx="30" cy="20" rx="10" ry="3" fill="none" stroke="currentColor" strokeWidth="2"/>
        <path d="M22 30 H38 M22 35 H38" stroke="currentColor" strokeWidth="1.2" opacity="0.6"/>
      </svg>

      {/* thread spool */}
      <svg className="authdecor__item ad--2" viewBox="0 0 60 60">
        <rect x="22" y="14" width="16" height="32" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
        <line x1="18" y1="18" x2="42" y2="18" stroke="currentColor" strokeWidth="2"/>
        <line x1="18" y1="42" x2="42" y2="42" stroke="currentColor" strokeWidth="2"/>
        <path d="M24 24 H36 M24 30 H36 M24 36 H36" stroke="currentColor" strokeWidth="1.2" opacity="0.6"/>
      </svg>

      {/* wooden toy horse (Channapatna-style) */}
      <svg className="authdecor__item ad--3" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="18" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="30" cy="30" r="11" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.6"/>
        <circle cx="30" cy="30" r="4" fill="currentColor" opacity="0.5"/>
      </svg>

      {/* block-print stamp */}
      <svg className="authdecor__item ad--4" viewBox="0 0 60 60">
        {[0,45,90,135,180,225,270,315].map(a => (
          <ellipse key={a} cx="30" cy="30" rx="5" ry="13" transform={`rotate(${a} 30 30)`} fill="none" stroke="currentColor" strokeWidth="1.6"/>
        ))}
        <circle cx="30" cy="30" r="4" fill="currentColor" opacity="0.5"/>
      </svg>

      {/* woven diamond */}
      <svg className="authdecor__item ad--5" viewBox="0 0 60 60">
        <path d="M30 12 L48 30 L30 48 L12 30 Z" fill="none" stroke="currentColor" strokeWidth="2"/>
        <path d="M30 22 L38 30 L30 38 L22 30 Z" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.6"/>
      </svg>

      {/* small pot */}
      <svg className="authdecor__item ad--6" viewBox="0 0 60 60">
        <path d="M22 24 Q30 18 38 24 Q40 38 30 44 Q20 38 22 24 Z" fill="none" stroke="currentColor" strokeWidth="2"/>
        <ellipse cx="30" cy="24" rx="8" ry="2.5" fill="none" stroke="currentColor" strokeWidth="1.6"/>
      </svg>
    </div>
  );
}