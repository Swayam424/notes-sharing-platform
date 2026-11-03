import '../styles/backdrop.css';

/**
 * Decorative, animated study objects drawn as ink line-art.
 * Purely visual: hidden from assistive tech, never intercepts clicks,
 * and frozen when the user prefers reduced motion.
 *
 * variant="full"   – landing, onboarding, 404
 * variant="subtle" – app shell: fewer objects, lower contrast, slower
 */
export default function StudyBackdrop({ variant = 'full' }: { variant?: 'full' | 'subtle' }) {
  const full = variant === 'full';
  return (
    <div className={`study-backdrop study-backdrop--${variant}`} aria-hidden="true">
      {/* Open book with flipping pages */}
      <div className="sb-item sb-book">
        <div className="sb-book__spread">
          <span className="sb-book__cover sb-book__cover--left" />
          <span className="sb-book__cover sb-book__cover--right" />
          <span className="sb-book__page" style={{ animationDelay: '0s' }} />
          <span className="sb-book__page" style={{ animationDelay: '1.2s' }} />
          <span className="sb-book__page" style={{ animationDelay: '2.4s' }} />
          <span className="sb-book__lines sb-book__lines--left" />
          <span className="sb-book__lines sb-book__lines--right" />
        </div>
      </div>

      {/* Floating pencil drawing a squiggle */}
      <div className="sb-item sb-pencil">
        <svg viewBox="0 0 160 40" className="sb-pencil__svg">
          <g className="sb-pencil__body">
            <rect x="22" y="12" width="104" height="16" rx="2" className="sb-fill-highlight sb-stroke" />
            <line x1="22" y1="20" x2="126" y2="20" className="sb-stroke sb-thin" />
            <rect x="126" y="12" width="14" height="16" className="sb-fill-paper sb-stroke" />
            <rect x="140" y="12" width="12" height="16" rx="3" className="sb-fill-eraser sb-stroke" />
            <path d="M22 12 L4 20 L22 28 Z" className="sb-fill-paper sb-stroke" />
            <path d="M9 17.6 L4 20 L9 22.4 Z" className="sb-fill-ink" />
          </g>
        </svg>
        <svg viewBox="0 0 120 30" className="sb-pencil__trail">
          <path d="M2 15 C 14 2, 26 28, 38 15 S 62 2, 74 15 S 98 28, 118 12" className="sb-stroke sb-scribble" />
        </svg>
      </div>

      {/* Bouncing eraser with a shadow */}
      <div className="sb-item sb-eraser">
        <div className="sb-eraser__body">
          <span className="sb-eraser__sleeve" />
        </div>
        <span className="sb-eraser__shadow" />
      </div>

      {/* Paper plane on a looping flight path */}
      <div className="sb-item sb-plane">
        <svg viewBox="0 0 64 40">
          <path d="M2 20 L62 2 L40 38 L30 24 Z" className="sb-fill-paper sb-stroke" />
          <path d="M62 2 L30 24 L28 34" className="sb-stroke sb-thin" />
        </svg>
      </div>

      {full && (
        <>
          {/* Sticky note that sways */}
          <div className="sb-item sb-sticky">
            <svg viewBox="0 0 70 70">
              <path d="M2 2 H68 V52 L52 68 H2 Z" className="sb-fill-highlight sb-stroke" />
              <path d="M52 68 V52 H68" className="sb-stroke" />
              <line x1="12" y1="18" x2="56" y2="18" className="sb-stroke sb-thin" />
              <line x1="12" y1="30" x2="50" y2="30" className="sb-stroke sb-thin" />
              <line x1="12" y1="42" x2="38" y2="42" className="sb-stroke sb-thin" />
            </svg>
          </div>

          {/* Ruler drifting */}
          <div className="sb-item sb-ruler">
            <svg viewBox="0 0 180 28">
              <rect x="1" y="1" width="178" height="26" rx="3" className="sb-fill-paper sb-stroke" />
              {Array.from({ length: 17 }, (_, i) => (
                <line key={i} x1={10 + i * 10} y1="1" x2={10 + i * 10} y2={i % 5 === 0 ? 14 : 8} className="sb-stroke sb-thin" />
              ))}
            </svg>
          </div>

          {/* Paperclip tumbling */}
          <div className="sb-item sb-clip">
            <svg viewBox="0 0 24 60">
              <path d="M8 18 V46 a6 6 0 0 0 12 0 V10 a8 8 0 0 0 -16 0 V48 a10 10 0 0 0 20 0 V22" className="sb-stroke" fill="none" />
            </svg>
          </div>

          {/* Highlighter bobbing */}
          <div className="sb-item sb-marker">
            <svg viewBox="0 0 120 34">
              <rect x="30" y="5" width="86" height="24" rx="5" className="sb-fill-paper sb-stroke" />
              <rect x="14" y="8" width="18" height="18" rx="2" className="sb-fill-highlight sb-stroke" />
              <path d="M14 11 L2 15 L2 19 L14 23 Z" className="sb-fill-highlight sb-stroke" />
              <line x1="48" y1="5" x2="48" y2="29" className="sb-stroke sb-thin" />
            </svg>
          </div>

          {/* A few formula scraps drifting upward */}
          <span className="sb-item sb-glyph sb-glyph--1">∫ f(x) dx</span>
          <span className="sb-item sb-glyph sb-glyph--2">a² + b² = c²</span>
          <span className="sb-item sb-glyph sb-glyph--3">O(n log n)</span>
        </>
      )}
    </div>
  );
}
