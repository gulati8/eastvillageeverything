// EVE v3 — Place detail. Tag-driven, graceful with missing editorial.

function EveDetailScreen({ dark = false, place = EVE_PLACES[1], heroMode = 'auto' }) {
  const t = dark ? EVE.dark : EVE.light;
  const primary = EVE_PRIMARY_TAG_FOR(place);
  const otherTags = EVE_TAGS_FOR(place);
  const hasPhoto = !!place.photoUrl && heroMode !== 'typographic' && heroMode !== 'category';
  const hasFallback = primary && primary.fallbackImage && heroMode !== 'typographic';
  const heroSrc = hasPhoto ? place.photoUrl : (hasFallback ? primary.fallbackImage : null);
  const tint = (primary && primary.tint) || '#3D2818';
  const accent = (primary && primary.accent) || '#D4A574';

  return (
    <div style={{
      width: '100%', height: '100%', background: t.paper, color: t.ink,
      fontFamily: EVE.fonts.body, position: 'relative', overflow: 'hidden',
    }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: 380, background: heroSrc ? `url(${heroSrc}) center/cover` : tint, overflow: 'hidden' }}>
        {!heroSrc && (
          <>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(135deg, ${accent}11 0 1px, transparent 1px 14px)` }}/>
            <div style={{
              position: 'absolute', left: 22, right: 22, bottom: 22, color: '#fff',
            }}>
              <div style={{ fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700, color: accent, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
                ※ {primary ? primary.label : 'Spot'}
              </div>
              <div style={{ fontFamily: EVE.fonts.display, fontWeight: 400, fontSize: 56, lineHeight: 0.95, letterSpacing: '-0.02em', fontStyle: 'italic' }}>{place.name}</div>
            </div>
          </>
        )}
        {heroSrc && (
          <>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, transparent 35%, rgba(0,0,0,0.65) 100%)' }}/>
            <div style={{ position: 'absolute', left: 22, right: 22, bottom: 22, color: '#fff' }}>
              <div style={{ fontFamily: EVE.fonts.display, fontWeight: 400, fontSize: 52, lineHeight: 0.95, letterSpacing: '-0.02em', fontStyle: 'italic' }}>{place.name}</div>
              {primary && (
                <div style={{ fontFamily: EVE.fonts.ui, fontSize: 12, fontWeight: 500, marginTop: 8, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.02em' }}>
                  {primary.label}{place.address ? ` · ${place.address}` : ''}
                </div>
              )}
            </div>
          </>
        )}
        <div style={{ position: 'absolute', top: 60, left: 16, zIndex: 5 }}>
          <div style={{ width: 36, height: 36, borderRadius: 999, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="#1F1A14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      <div style={{ padding: '22px 22px 100px', overflow: 'hidden', height: 'calc(100% - 380px)', boxSizing: 'border-box' }}>
        {/* Pitch — only if present */}
        {place.pitch && (
          <div style={{ fontFamily: EVE.fonts.body, fontSize: 17, lineHeight: 1.5, color: t.ink }}>
            {place.pitch}
          </div>
        )}

        {/* Perfect when — only if present */}
        {place.perfectWhen && (
          <div style={{
            marginTop: place.pitch ? 18 : 0, padding: '14px 16px',
            borderRadius: EVE.radius.md, background: t.paper2,
          }}>
            <div style={{ fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 600, color: t.accentDeep, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Perfect when</div>
            <div style={{ marginTop: 4, fontFamily: EVE.fonts.display, fontStyle: 'italic', fontSize: 22, lineHeight: 1.15, color: t.ink, letterSpacing: '-0.005em' }}>{place.perfectWhen}.</div>
          </div>
        )}

        {/* Insider tip — only if present */}
        {place.insiderTip && (
          <div style={{ marginTop: 22 }}>
            <SectionLabel dark={dark}>The move</SectionLabel>
            <div style={{ fontFamily: EVE.fonts.body, fontSize: 16, lineHeight: 1.5, color: t.ink2, marginTop: 8 }}>{place.insiderTip}</div>
          </div>
        )}

        {/* Crowd — only if present */}
        {place.crowd && (
          <div style={{ marginTop: 20 }}>
            <SectionLabel dark={dark}>Who's there</SectionLabel>
            <div style={{ fontFamily: EVE.fonts.body, fontSize: 16, lineHeight: 1.5, color: t.ink2, marginTop: 8 }}>{place.crowd}.</div>
          </div>
        )}

        {/* Address/contact strip — always shown if any field present */}
        {(place.address || place.phone || place.website) && (
          <div style={{ marginTop: 22 }}>
            <SectionLabel dark={dark}>Find it</SectionLabel>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {place.address && <div style={{ fontFamily: EVE.fonts.body, fontSize: 15, color: t.ink2 }}>{place.address}{place.cross ? ` · ${place.cross}` : ''}</div>}
              {place.phone && <div style={{ fontFamily: EVE.fonts.body, fontSize: 15, color: t.ink2 }}>{place.phone}</div>}
              {place.website && <div style={{ fontFamily: EVE.fonts.body, fontSize: 14, color: t.accentDeep, textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.website}</div>}
            </div>
          </div>
        )}

        {/* Tag pips — REAL tags only, mapped from EVE_TAGS */}
        {(primary || otherTags.length > 0) && (
          <div style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {primary && (
              <div style={{
                padding: '6px 12px', borderRadius: 999,
                background: t.ink, color: t.paper,
                fontFamily: EVE.fonts.ui, fontSize: 12, fontWeight: 600,
              }}>{primary.label}</div>
            )}
            {otherTags.map((tag) => (
              <div key={tag.id} style={{
                padding: '6px 12px', borderRadius: 999, background: t.paper2,
                fontFamily: EVE.fonts.ui, fontSize: 12, fontWeight: 500, color: t.ink2,
              }}>{tag.label}</div>
            ))}
          </div>
        )}
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
        {place.phone && (
          <button style={{
            padding: '14px 16px', borderRadius: 999,
            background: 'transparent', color: t.ink,
            border: `1px solid ${t.line}`,
            fontFamily: EVE.fonts.ui, fontSize: 14, fontWeight: 600,
          }}>Call</button>
        )}
      </div>
    </div>
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
