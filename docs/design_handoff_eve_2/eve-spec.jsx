// EVE v2 — Lifestyle design system spec sheet.

function EveSpecSheet() {
  const sw = (name, hex, sub) => (
    <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ width: '100%', height: 72, background: hex,
        borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)' }}/>
      <div style={{ fontFamily: EVE.fonts.ui, fontSize: 12 }}>
        <div style={{ color: '#1F1A14', fontWeight: 600 }}>{name}</div>
        <div style={{ color: '#8C7E6C', fontWeight: 500 }}>{hex}{sub ? ' · ' + sub : ''}</div>
      </div>
    </div>
  );
  return (
    <div style={{
      width: 880, padding: 56, background: EVE.light.paper, color: EVE.light.ink,
      fontFamily: EVE.fonts.body,
    }}>
      <div style={{
        fontFamily: EVE.fonts.ui, fontSize: 12, fontWeight: 600,
        color: EVE.light.ink3, letterSpacing: '0.04em', textTransform: 'uppercase',
      }}>EVE · Design system v2</div>

      <div style={{
        fontFamily: EVE.fonts.display, fontWeight: 400, fontSize: 84,
        lineHeight: 0.95, letterSpacing: '-0.02em', marginTop: 18,
        color: EVE.light.ink,
      }}>
        Made by <span style={{ fontStyle: 'italic' }}>a friend</span><br/>
        who lives here.
      </div>

      <div style={{
        marginTop: 28, fontFamily: EVE.fonts.body, fontSize: 18, lineHeight: 1.55,
        maxWidth: 640, color: EVE.light.ink2,
      }}>
        EVE is a lifestyle directory for the East Village — Urban Daddy meets Zillow.
        Every place has a photo because seeing a room tells you more than reading
        a tag. The voice is second-person, warm, opinionated: not "Bar · Open till 4"
        but "the jukebox is the whole personality." Type pairs a dramatic editorial
        italic (<em>Instrument Serif</em>) with a literary body (<em>Source Serif 4</em>)
        and a friendly, modern UI sans (<em>Schibsted Grotesk</em>). The palette is
        warm cream and espresso with a sunset-amber accent — feels like a candlelit
        dinner, not a dashboard.
      </div>

      <H>Type</H>
      <Row label="Display · Instrument Serif">
        <div style={{ fontFamily: EVE.fonts.display, fontSize: 64, lineHeight: 0.95, letterSpacing: '-0.02em' }}>
          Tonight, you want <span style={{ fontStyle: 'italic' }}>something soft.</span>
        </div>
        <Cap>Display · 400 / italic · h1 56–84 · h2 32–44</Cap>
      </Row>
      <Row label="Body · Source Serif 4">
        <div style={{ fontFamily: EVE.fonts.body, fontSize: 18, lineHeight: 1.5, maxWidth: 540 }}>
          The jukebox is the whole personality. Go on a Tuesday — it gets weird in the best way, and your $4 PBR will somehow taste like the meaning of life.
        </div>
        <Cap>Body · 400 / italic 400 · 17/26 · pitch 18/27</Cap>
      </Row>
      <Row label="UI · Schibsted Grotesk">
        <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
          <div style={{ fontFamily: EVE.fonts.ui, fontSize: 16, fontWeight: 600 }}>Tonight</div>
          <div style={{ fontFamily: EVE.fonts.ui, fontSize: 13, fontWeight: 600, color: EVE.light.ink3 }}>Open till 4am</div>
          <div style={{ fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: EVE.light.accentDeep }}>Perfect when</div>
        </div>
        <Cap>UI · 500 / 600 / 700 · labels, chips, buttons</Cap>
      </Row>

      <H>Color · Light</H>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {sw('paper', EVE.light.paper, 'bg')}
        {sw('paper-2', EVE.light.paper2, 'recess')}
        {sw('ink', EVE.light.ink, 'fg')}
        {sw('ink-3', EVE.light.ink3, 'meta')}
        {sw('accent', EVE.light.accent, 'sunset')}
      </div>
      <H>Color · Dark</H>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {sw('paper', EVE.dark.paper, 'bg')}
        {sw('paper-2', EVE.dark.paper2, 'recess')}
        {sw('ink', EVE.dark.ink, 'cream')}
        {sw('ink-3', EVE.dark.ink3, 'meta')}
        {sw('accent', EVE.dark.accent, 'sunset+')}
      </div>

      <H>Spacing &amp; radius</H>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <div>
          <Cap>Scale (4pt)</Cap>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 12 }}>
            {[4,8,12,16,22,32,44,56].map((n) => (
              <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 22, height: n, background: EVE.light.ink, borderRadius: 4 }}/>
                <div style={{ fontFamily: EVE.fonts.ui, fontSize: 10, fontWeight: 500, color: EVE.light.ink3 }}>{n}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Cap>Radius</Cap>
          <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'flex-end' }}>
            {[{n:'sm',r:8},{n:'md',r:14},{n:'lg',r:22},{n:'xl',r:30},{n:'pill',r:999}].map(({n,r}) => (
              <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 60, height: 40, background: EVE.light.ink, borderRadius: r }}/>
                <div style={{ fontFamily: EVE.fonts.ui, fontSize: 10, fontWeight: 500, color: EVE.light.ink3 }}>{n}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <H>Mood pills</H>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {EVE_TAGS.slice(0, 6).map((tag, i) => {
          const active = i === 0;
          return (
            <div key={tag.id} style={{
              padding: '10px 16px', borderRadius: 999,
              fontFamily: EVE.fonts.ui, fontSize: 13, fontWeight: 600,
              background: active ? EVE.light.chipActive : EVE.light.chip,
              color: active ? EVE.light.paper : EVE.light.ink,
              border: active ? 'none' : `1px solid ${EVE.light.line}`,
              boxShadow: active ? 'none' : '0 1px 2px rgba(31,26,20,0.04)',
            }}>{tag.label}</div>
          );
        })}
      </div>

      <H>Voice — house style</H>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ padding: 18, borderRadius: 14, background: '#fff', border: `1px solid ${EVE.light.line}` }}>
          <div style={{ fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700, color: '#3FB871', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Yes</div>
          <div style={{ fontFamily: EVE.fonts.body, fontSize: 16, lineHeight: 1.5 }}>
            "The cocktail bar that taught New York how to make cocktails again. Walk in after 11 and let the bartender choose."
          </div>
        </div>
        <div style={{ padding: 18, borderRadius: 14, background: '#fff', border: `1px solid ${EVE.light.line}` }}>
          <div style={{ fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700, color: '#C44', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>No</div>
          <div style={{ fontFamily: EVE.fonts.body, fontSize: 16, lineHeight: 1.5, color: EVE.light.ink3, fontStyle: 'italic' }}>
            "Bar · Cocktails · Reservations recommended · 4.5 stars (1,247 reviews)"
          </div>
        </div>
      </div>

      <H>Place row</H>
      <div style={{ maxWidth: 360 }}>
        <PlaceRow place={EVE_PLACES[0]} dark={false} last/>
      </div>
    </div>
  );
}

function H({ children }) {
  return (
    <div style={{ marginTop: 56, marginBottom: 18 }}>
      <div style={{ borderTop: `1px solid ${EVE.light.line}`, marginBottom: 14 }}/>
      <div style={{
        fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700,
        color: EVE.light.accentDeep, letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 600,
        color: EVE.light.ink3, letterSpacing: '0.08em', textTransform: 'uppercase',
        marginBottom: 12,
      }}>{label}</div>
      {children}
    </div>
  );
}

function Cap({ children }) {
  return <div style={{
    marginTop: 8, fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 500,
    color: EVE.light.ink3, letterSpacing: '0.04em',
  }}>{children}</div>;
}

window.EveSpecSheet = EveSpecSheet;
