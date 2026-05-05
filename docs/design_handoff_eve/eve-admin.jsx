// EVE — Admin photo upload sheet. The affordance for the admin user
// (and eventually verified locals) to add or replace a place's photo.

function EveAdminUploadSheet({ dark = false, place = EVE_PLACES[1] }) {
  const t = dark ? EVE.dark : EVE.light;
  const cat = EVE_CATEGORIES[place.category] || EVE_CATEGORIES.dive;
  return (
    <div style={{
      width: '100%', height: '100%', background: t.paper, color: t.ink,
      fontFamily: EVE.fonts.body, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ height: 54 }}/>

      {/* Sheet header */}
      <div style={{ padding: '8px 22px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontFamily: EVE.fonts.ui, fontSize: 13, fontWeight: 600, color: t.ink2 }}>Cancel</div>
        <div style={{ fontFamily: EVE.fonts.ui, fontSize: 13, fontWeight: 700, color: t.ink3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Add a photo</div>
        <div style={{ fontFamily: EVE.fonts.ui, fontSize: 13, fontWeight: 700, color: t.ink3, opacity: 0.4 }}>Save</div>
      </div>

      <div style={{ padding: '22px 22px 0' }}>
        <div style={{
          fontFamily: EVE.fonts.display, fontWeight: 400, fontSize: 32,
          lineHeight: 1.05, letterSpacing: '-0.015em', color: t.ink,
        }}>
          Help us show <span style={{ fontStyle: 'italic' }}>{place.name}</span> the way it really feels.
        </div>
        <div style={{
          marginTop: 10, fontFamily: EVE.fonts.body, fontSize: 15, lineHeight: 1.45,
          color: t.ink2,
        }}>
          A real photo from inside the place — not a logo, not a menu, not the storefront from across the street. Show the room, the bar, the booth you love.
        </div>
      </div>

      {/* Upload tile */}
      <div style={{ padding: '20px 22px 0' }}>
        <div style={{
          width: '100%', height: 200, borderRadius: EVE.radius.lg,
          border: `1.5px dashed ${t.ink3}`,
          background: t.paper2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 999,
            background: t.ink, color: t.paper,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontFamily: EVE.fonts.ui, fontSize: 14, fontWeight: 600, color: t.ink }}>Take or choose a photo</div>
          <div style={{ fontFamily: EVE.fonts.body, fontSize: 12, color: t.ink3, fontStyle: 'italic' }}>
            JPG or PNG · up to 8 MB
          </div>
        </div>
      </div>

      {/* Until then preview */}
      <div style={{ padding: '24px 22px 0' }}>
        <div style={{
          fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700,
          color: t.ink3, letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>Until you add one</div>
        <div style={{
          fontFamily: EVE.fonts.body, fontSize: 13, color: t.ink2, marginTop: 6, lineHeight: 1.5,
        }}>
          We'll show a generic <strong style={{ color: t.ink }}>{cat.label.toLowerCase()}</strong> photo so the card still has presence — never a stand-in pretending to be {place.name}.
        </div>
        <div style={{ marginTop: 12, borderRadius: EVE.radius.md, overflow: 'hidden', height: 140, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: `url(${cat.photo}) center/cover` }}/>
          <div style={{
            position: 'absolute', left: 12, bottom: 10,
            padding: '4px 9px', borderRadius: 999,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
            fontFamily: EVE.fonts.ui, fontSize: 10, fontWeight: 500,
            color: 'rgba(255,255,255,0.92)',
          }}>※ {cat.label.toLowerCase()} · stock</div>
        </div>
      </div>

      {/* House rules */}
      <div style={{ padding: '24px 22px 0' }}>
        <div style={{
          fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700,
          color: t.ink3, letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>House rules</div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Yes', 'Real photos from inside, taken by you', '#3FB871'],
            ['Yes', 'Drinks, food, the room — what makes it feel like itself', '#3FB871'],
            ['No',  'Logos, menus, screenshots, stock images',                 '#C44'],
            ['No',  'Photos of other people without consent',                  '#C44'],
          ].map(([yn, txt, col], i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, padding: '2px 0', textAlign: 'center', flexShrink: 0,
                fontFamily: EVE.fonts.ui, fontSize: 10, fontWeight: 700,
                color: col, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>{yn}</div>
              <div style={{ fontFamily: EVE.fonts.body, fontSize: 14, lineHeight: 1.45, color: t.ink2 }}>{txt}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.EveAdminUploadSheet = EveAdminUploadSheet;
