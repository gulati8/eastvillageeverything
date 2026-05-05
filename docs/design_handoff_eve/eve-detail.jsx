// EVE v2 — Place detail. Big hero photo, story-style layout.

function EveDetailScreen({ dark = false, place = EVE_PLACES[1], heroMode = 'auto' }) {
  const t = dark ? EVE.dark : EVE.light;
  const cat = EVE_CATEGORIES[place.category] || EVE_CATEGORIES.dive;
  const hasPhoto = !!place.photo && heroMode !== 'typographic' && heroMode !== 'category';
  const showPhotoOverlayTitle = hasPhoto || heroMode === 'category';

  return (
    <div style={{
      width: '100%', height: '100%', background: t.paper, color: t.ink,
      fontFamily: EVE.fonts.body, position: 'relative', overflow: 'hidden',
    }}>
      {/* Hero — uses unified PlaceHero so fallback logic is the same */}
      <div style={{ position: 'relative', height: 380 }}>
        <PlaceHero place={place} dark={dark} height={380} mode={heroMode} adminAffordance={!hasPhoto}/>
        {/* Strong bottom gradient + title overlay (only for photo modes) */}
        {showPhotoOverlayTitle && (
          <>
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, transparent 35%, rgba(0,0,0,0.65) 100%)',
            }}/>
            <div style={{
              position: 'absolute', left: 22, right: 22, bottom: 22, color: '#fff',
            }}>
              <div style={{
                fontFamily: EVE.fonts.display, fontWeight: 400, fontSize: 56,
                lineHeight: 0.95, letterSpacing: '-0.02em', fontStyle: 'italic',
              }}>{place.name}</div>
              <div style={{
                fontFamily: EVE.fonts.ui, fontSize: 12, fontWeight: 500,
                marginTop: 8, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.02em',
              }}>{place.kind} · {place.street} · {place.cross}</div>
            </div>
          </>
        )}

        {/* Top controls */}
        <div style={{
          position: 'absolute', top: 60, left: 16, right: 16,
          display: 'flex', justifyContent: 'space-between', zIndex: 5,
        }}>
          <CircleBtn>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="#1F1A14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </CircleBtn>
        </div>
      </div>

      {/* If typographic hero, repeat title in body for clarity in addresses block */}
      <div style={{ padding: '22px 22px 100px', overflow: 'hidden', height: 'calc(100% - 380px)', boxSizing: 'border-box' }}>
        {!showPhotoOverlayTitle && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 600,
              color: t.ink3, letterSpacing: '0.02em',
            }}>{place.kind} · {place.street}</div>
          </div>
        )}
        <div style={{ fontFamily: EVE.fonts.body, fontSize: 17, lineHeight: 1.5, color: t.ink }}>
          {place.pitch}
        </div>

        <div style={{
          marginTop: 18, padding: '14px 16px',
          borderRadius: EVE.radius.md, background: t.paper2,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{
            fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 600,
            color: t.accentDeep, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>Perfect when</div>
          <div style={{
            fontFamily: EVE.fonts.display, fontStyle: 'italic',
            fontSize: 22, lineHeight: 1.15, color: t.ink, letterSpacing: '-0.005em',
          }}>{place.perfect}.</div>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionLabel dark={dark}>The move</SectionLabel>
          <div style={{ fontFamily: EVE.fonts.body, fontSize: 16, lineHeight: 1.5, color: t.ink2, marginTop: 8 }}>{place.insider}</div>
        </div>
        <div style={{ marginTop: 20 }}>
          <SectionLabel dark={dark}>Who's there</SectionLabel>
          <div style={{ fontFamily: EVE.fonts.body, fontSize: 16, lineHeight: 1.5, color: t.ink2, marginTop: 8 }}>{place.crowd}.</div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {place.tags.map((tag) => (
            <div key={tag} style={{
              padding: '6px 12px', borderRadius: 999, background: t.paper2,
              fontFamily: EVE.fonts.ui, fontSize: 12, fontWeight: 500, color: t.ink2,
            }}>{tag}</div>
          ))}
        </div>
      </div>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '12px 18px 28px',
        background: dark ? 'rgba(22,17,12,0.95)' : 'rgba(251,246,238,0.95)',
        borderTop: `1px solid ${t.line}`,
        display: 'flex', gap: 10, backdropFilter: 'blur(12px)',
      }}>
        <button style={{
          flex: 1, padding: '14px 16px', borderRadius: 999, border: 'none',
          background: t.ink, color: t.paper,
          fontFamily: EVE.fonts.ui, fontSize: 14, fontWeight: 600,
        }}>Get directions</button>
        <button style={{
          padding: '14px 16px', borderRadius: 999,
          background: 'transparent', color: t.ink,
          border: `1px solid ${t.line}`,
          fontFamily: EVE.fonts.ui, fontSize: 14, fontWeight: 600,
        }}>Call</button>
      </div>
    </div>
  );
}

function CircleBtn({ children }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 999,
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{children}</div>
  );
}

function SectionLabel({ children, dark }) {
  const t = dark ? EVE.dark : EVE.light;
  return (
    <div style={{
      fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700,
      color: t.ink3, letterSpacing: '0.1em', textTransform: 'uppercase',
    }}>{children}</div>
  );
}

window.EveDetailScreen = EveDetailScreen;
