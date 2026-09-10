/**
 * Ornamental craft motifs for the certificate. Two exports:
 *   <CraftPattern>  — a repeating decorative band
 *   <CraftSeal>     — a large circular hero emblem
 * Both pick their motif family from the craft string. Drawn in code, no photos.
 */

export function familyFor(craft = '') {
  const c = craft.toLowerCase();
  if (/(block|ajrakh|kalamkari|bagru|dabu|print)/.test(c)) return 'block';
  if (/(pottery|ceramic|terracotta|blue pottery|khurja)/.test(c)) return 'pottery';
  if (/(weav|ikat|silk|pashmina|saree|handloom|kani|textile|bandhani|zari)/.test(c)) return 'weave';
  if (/(paint|madhubani|pattachitra|warli|thangka|miniature|pichwai|folk)/.test(c)) return 'paint';
  if (/(metal|bidri|dokra|thewa|bell|brass|filigree|inlay|copper)/.test(c)) return 'metal';
  if (/(embroider|chikan|phulkari|kutch|sozni|zardozi|mirror)/.test(c)) return 'embroider';
  return 'block';
}

// A single ornamental tile per family — richer than plain geometry.
function tile(family, color) {
  const s = { fill: 'none', stroke: color, strokeWidth: 1, opacity: 0.7 };
  switch (family) {
    case 'pottery':
      return (
        <g>
          <circle cx="24" cy="24" r="18" {...s} />
          <circle cx="24" cy="24" r="13" {...s} opacity="0.5" />
          <circle cx="24" cy="24" r="8" {...s} opacity="0.4" />
          <circle cx="24" cy="24" r="3" fill={color} opacity="0.55" />
          {[0, 90, 180, 270].map((a) => (
            <circle key={a} cx={24 + 18 * Math.cos((a * Math.PI) / 180)} cy={24 + 18 * Math.sin((a * Math.PI) / 180)} r="1.6" fill={color} opacity="0.6" />
          ))}
        </g>
      );
    case 'weave':
      return (
        <g>
          {[8, 16, 24, 32, 40].map((x) => <line key={'v' + x} x1={x} y1="4" x2={x} y2="44" {...s} opacity="0.55" />)}
          {[8, 16, 24, 32, 40].map((y) => <line key={'h' + y} x1="4" y1={y} x2="44" y2={y} {...s} opacity="0.35" />)}
          <path d="M4 4 L44 44 M44 4 L4 44" {...s} opacity="0.15" />
        </g>
      );
    case 'paint':
      return (
        <g>
          <path d="M24 6 C34 14, 34 34, 24 42 C14 34, 14 14, 24 6 Z" {...s} opacity="0.65" />
          <path d="M24 12 C30 17, 30 31, 24 36 C18 31, 18 17, 24 12 Z" {...s} opacity="0.4" />
          <circle cx="24" cy="24" r="2.5" fill={color} opacity="0.6" />
          <path d="M10 24 Q24 18, 38 24 Q24 30, 10 24 Z" {...s} opacity="0.3" />
        </g>
      );
    case 'metal':
      return (
        <g>
          <path d="M24 4 L30 16 L44 18 L34 28 L37 42 L24 35 L11 42 L14 28 L4 18 L18 16 Z" {...s} opacity="0.6" />
          <circle cx="24" cy="24" r="6" {...s} opacity="0.5" />
          <circle cx="24" cy="24" r="2.5" fill={color} opacity="0.6" />
        </g>
      );
    case 'embroider':
      return (
        <g>
          {[[24, 6], [24, 42], [6, 24], [42, 24]].map(([cx, cy], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="4" {...s} opacity="0.55" />
              <circle cx={cx} cy={cy} r="1.5" fill={color} opacity="0.6" />
            </g>
          ))}
          <path d="M24 6 L42 24 L24 42 L6 24 Z" {...s} opacity="0.4" strokeDasharray="3 2" />
          <circle cx="24" cy="24" r="3" fill={color} opacity="0.5" />
        </g>
      );
    case 'block':
    default:
      return (
        <g>
          {/* a carved-block flower, like real Bagru stamps */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <ellipse key={a} cx="24" cy="24" rx="4" ry="10" transform={`rotate(${a} 24 24)`} {...s} opacity="0.5" />
          ))}
          <circle cx="24" cy="24" r="4" fill={color} opacity="0.55" />
          <rect x="6" y="6" width="36" height="36" rx="4" {...s} opacity="0.25" />
        </g>
      );
  }
}

/** Repeating decorative band. */
export default function CraftPattern({ craft, color = 'var(--p-accent)', height = 52 }) {
  const family = familyFor(craft);
  const id = `cp-${family}`;
  return (
    <svg width="100%" height={height} role="presentation" style={{ display: 'block' }}>
      <defs>
        <pattern id={id} width="48" height="48" patternUnits="userSpaceOnUse">
          {tile(family, color)}
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${id})`} />
    </svg>
  );
}

/** Large circular hero seal — the "wow" emblem. */
export function CraftSeal({ craft, color = 'var(--p-accent)', size = 120 }) {
  const family = familyFor(craft);
  const sid = `seal-${family}`;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="presentation" style={{ display: 'block' }}>
      {/* outer ring with notches, like a wax seal */}
      <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
      <circle cx="60" cy="60" r="48" fill="none" stroke={color} strokeWidth="0.8" opacity="0.35" />
      {Array.from({ length: 36 }).map((_, i) => {
        const a = (i * 10 * Math.PI) / 180;
        return (
          <line key={i}
            x1={60 + 48 * Math.cos(a)} y1={60 + 48 * Math.sin(a)}
            x2={60 + 54 * Math.cos(a)} y2={60 + 54 * Math.sin(a)}
            stroke={color} strokeWidth="0.8" opacity="0.4" />
        );
      })}
      {/* the craft motif, centered and enlarged */}
      <g transform="translate(36, 36) scale(1)">
        <svg width="48" height="48" viewBox="0 0 48 48">{tile(family, color)}</svg>
      </g>
    </svg>
  );
}