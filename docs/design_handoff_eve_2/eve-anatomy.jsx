// Row anatomy diagram — labeled callouts explain each component
// of the place row. Sits alongside the list mocks on canvas.

function RowAnatomy() {
  const t = EVE.light;
  const place = EVE_PLACES[0]; // Sophie's
  const primary = EVE_PRIMARY_TAG_FOR(place);
  const primaryLabel = primary ? primary.label : 'Place';
  const Lab = ({ children }) => (
    <div style={{
      fontFamily: EVE.fonts.ui, fontSize: 10, fontWeight: 700,
      color: '#8C7E6C', letterSpacing: '0.12em', textTransform: 'uppercase',
    }}>{children}</div>
  );
  const Note = ({ children }) => (
    <div style={{
      fontFamily: EVE.fonts.body, fontStyle: 'italic',
      fontSize: 13, lineHeight: 1.45, color: '#54483A',
      marginTop: 4, maxWidth: 240,
    }}>{children}</div>
  );
  const Callout = ({ top, left, w = 240, label, note, side = 'right' }) => (
    <div style={{
      position: 'absolute', top, left, width: w,
      paddingLeft: side === 'right' ? 14 : 0,
      paddingRight: side === 'left' ? 14 : 0,
      borderLeft: side === 'right' ? `1px solid #1F1A14` : 'none',
      borderRight: side === 'left' ? `1px solid #1F1A14` : 'none',
      textAlign: side === 'left' ? 'right' : 'left',
    }}>
      <Lab>{label}</Lab>
      <Note>{note}</Note>
    </div>
  );
  return (
    <div style={{
      width: '100%', height: '100%', background: t.paper, position: 'relative',
      padding: '40px 40px',
      fontFamily: EVE.fonts.body,
    }}>
      <div style={{
        fontFamily: EVE.fonts.display, fontStyle: 'italic',
        fontSize: 28, color: t.ink, letterSpacing: '-0.01em', marginBottom: 6,
      }}>Anatomy of a row.</div>
      <div style={{
        fontFamily: EVE.fonts.body, fontSize: 14, color: t.ink2,
        maxWidth: 520, lineHeight: 1.45, marginBottom: 28,
      }}>
        One row should answer "should I go?" before you tap. Photo or category fallback,
        live signal, distance, vibe, one italic line in friend voice.
      </div>

      {/* The row, blown up 1.4× and centered */}
      <div style={{
        position: 'relative', width: 600, margin: '0 auto',
        background: t.paper, padding: '20px 0',
      }}>
        <div style={{
          padding: '16px 0',
          display: 'flex', gap: 14, alignItems: 'stretch',
          transform: 'scale(1.4)', transformOrigin: 'center top',
          width: 360, margin: '0 auto',
        }}>
          {/* Photo with badge */}
          <div style={{
            width: 96, height: 124, borderRadius: 14, flexShrink: 0,
            background: `url(${place.photo}) center/cover`,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 6, left: 6,
              padding: '3px 7px', borderRadius: 999,
              background: 'rgba(255,255,255,0.92)',
              fontFamily: EVE.fonts.ui, fontSize: 10, fontWeight: 700,
              color: '#1F1A14',
            }}>{place.distance}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{
                fontFamily: EVE.fonts.display, fontStyle: 'italic',
                fontSize: 22, lineHeight: 1.0, color: t.ink,
              }}>{place.name}</div>
              <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
                <path d="M2 1h10v13l-5-3.5L2 14V1z" stroke={t.ink3} strokeWidth="1.4"/>
              </svg>
            </div>
            <div style={{
              fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 600,
              color: t.ink3, marginTop: 4,
            }}>{primaryLabel} · $ · Light</div>
            <SignalPip place={place} dark={false}/>
            <div style={{
              marginTop: 8, fontFamily: EVE.fonts.body, fontStyle: 'italic',
              fontSize: 13, lineHeight: 1.4, color: t.ink2,
            }}>You want to talk for hours and not look at a menu.</div>
          </div>
        </div>
      </div>

      {/* Callouts */}
      <Callout top={120} left={40} side="left" w={220}
        label="01 · Photo or fallback"
        note="Real photo when we have one. Otherwise a category stand-in (drinks/food/atmosphere) or a typographic block. Never the place's storefront if we can't verify it."/>
      <Callout top={250} left={40} side="left" w={220}
        label="02 · Distance pill"
        note="Walk time, not miles. Locals think in minutes. Always white-on-blur so it reads on any photo."/>

      <Callout top={120} left={780} w={220}
        label="03 · Italic name + save"
        note="Instrument Serif italic — the only display moment in the row. Save tucks to the right; tap target is the whole row."/>
      <Callout top={220} left={780} w={220}
        label="04 · Type · price · crowd"
        note="Three quick facts in the UI face. Crowd is fuzzy by design — 'Light', 'Filling up', 'Booked till 11' — never a number."/>
      <Callout top={340} left={780} w={220}
        label="05 · The signal pip"
        note="The decision-driver. Pulses if urgent. Color-coded by kind: amber=happy hour, red=closing soon, violet=event, green=walk-ins."/>
      <Callout top={460} left={780} w={220}
        label="06 · The pitch"
        note="One line in friend voice — 'when you want to…'. If this doesn't land, the row failed."/>
    </div>
  );
}

window.RowAnatomy = RowAnatomy;
