// EVE — PlaceHero. The unified hero block used in cards and detail.
// Decides between: real submitted photo → category food/drink stock →
// typographic fallback (no image, just type-on-tint).
//
// Style options (settable per render):
//   "auto"        — photo if present, category fallback if not (default)
//   "category"    — force category food/drink image
//   "typographic" — force type-on-tint, no image at all
//
// Always shows a small footer credit so users know what they're looking at:
//   "Submitted by @username"  → real photo
//   "Cocktail bars · stock"   → category fallback
//   No credit needed for typographic.

function PlaceHero({ place, dark = false, height = 260, showName = false, mode = 'auto', adminAffordance = false }) {
  const cat = EVE_CATEGORIES[place.category] || EVE_CATEGORIES.dive;
  const hasPhoto = !!place.photo && mode !== 'typographic' && mode !== 'category';
  const useCategory = !hasPhoto && mode !== 'typographic';
  const photo = hasPhoto ? place.photo : (useCategory ? cat.photo : null);

  return (
    <div style={{
      position: 'relative', width: '100%', height,
      background: photo ? `url(${photo}) center/cover` : cat.tint,
      overflow: 'hidden',
    }}>
      {/* Typographic fallback — no image */}
      {!photo && <TypographicHero place={place} cat={cat}/>}

      {/* Photo gradient — only when there's a photo */}
      {photo && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.55) 100%)',
        }}/>
      )}

      {/* Hours pill (top-left) */}
      <div style={{
        position: 'absolute', top: 14, left: 14,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 11px', borderRadius: 999,
        background: 'rgba(255,255,255,0.92)',
        fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 600,
        color: '#1F1A14', backdropFilter: 'blur(8px)',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: 999,
          background: place.open ? '#3FB871' : '#A09382' }}/>
        {place.hours}
      </div>

      {/* Save (top-right) */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        width: 36, height: 36, borderRadius: 999,
        background: 'rgba(255,255,255,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}>
        <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
          <path d="M2 2h12v14l-6-4-6 4V2z" stroke="#1F1A14" strokeWidth="1.6"/>
        </svg>
      </div>

      {/* Featured name overlay */}
      {showName && (
        <div style={{ position: 'absolute', left: 18, bottom: 16, right: 18, color: '#fff' }}>
          <div style={{
            fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.85)',
          }}>Tonight's pick</div>
          <div style={{
            fontFamily: EVE.fonts.display, fontWeight: 400, fontSize: 38,
            lineHeight: 1.0, letterSpacing: '-0.015em', marginTop: 6,
            fontStyle: 'italic',
          }}>{place.name}</div>
        </div>
      )}

      {/* Image source credit (bottom-left, small) — only when there's a photo */}
      {photo && !showName && (
        <div style={{
          position: 'absolute', left: 14, bottom: 12,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 9px', borderRadius: 999,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
          fontFamily: EVE.fonts.ui, fontSize: 10, fontWeight: 500,
          color: 'rgba(255,255,255,0.92)', letterSpacing: '0.02em',
        }}>
          {hasPhoto
            ? <span><span style={{ opacity: 0.7 }}>📷</span> {place.photoCredit || 'Submitted by a regular'}</span>
            : <span><span style={{ opacity: 0.7 }}>※</span> {cat.label.toLowerCase()} · stock</span>}
        </div>
      )}

      {/* Admin upload affordance — bottom-right, only on featured/empty */}
      {adminAffordance && !hasPhoto && (
        <div style={{
          position: 'absolute', right: 14, bottom: 14,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 999,
          background: 'rgba(255,255,255,0.95)',
          fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 600,
          color: '#1F1A14', backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="#1F1A14" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Add a photo
        </div>
      )}
    </div>
  );
}

// Typographic hero — when there's no photo at all. The name set big
// over a category-tinted color block. This is the "honest" fallback.
function TypographicHero({ place, cat }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: cat.tint,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      padding: '0 22px 22px',
      color: '#fff',
      overflow: 'hidden',
    }}>
      {/* Subtle pattern — diagonal hairlines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(135deg, ${cat.accent}11 0 1px, transparent 1px 14px)`,
        opacity: 0.7,
      }}/>
      {/* Tiny category mark */}
      <div style={{
        position: 'absolute', top: 60, left: 22,
        fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: cat.accent,
      }}>※ &nbsp;{cat.label}</div>

      {/* Name big */}
      <div style={{
        position: 'relative',
        fontFamily: EVE.fonts.display, fontWeight: 400, fontSize: 56,
        lineHeight: 0.92, letterSpacing: '-0.02em', fontStyle: 'italic',
        color: '#fff', textWrap: 'balance',
      }}>{place.name}</div>
      <div style={{
        position: 'relative', marginTop: 6,
        fontFamily: EVE.fonts.body, fontSize: 13, fontStyle: 'italic',
        color: cat.accent, opacity: 0.95,
      }}>{place.vibe}</div>
    </div>
  );
}

window.PlaceHero = PlaceHero;
