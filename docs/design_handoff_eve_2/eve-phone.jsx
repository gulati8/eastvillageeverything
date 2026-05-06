// EVE v2 — Phone frame. Same idea, warmer.

function EvePhone({ children, dark = false, label, width = 390, height = 800 }) {
  const t = dark ? EVE.dark : EVE.light;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
      {label && (
        <div style={{
          fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 500,
          letterSpacing: '0.02em', color: '#8C7E6C',
        }}>{label}</div>
      )}
      <div style={{
        width: width + 16, height: height + 16,
        background: '#0a0a0a',
        borderRadius: 56, padding: 8, boxSizing: 'border-box',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.35), 0 8px 20px -8px rgba(0,0,0,0.2)',
      }}>
        <div style={{
          width, height, position: 'relative',
          background: t.paper, borderRadius: 48, overflow: 'hidden',
          color: t.ink, fontFamily: EVE.fonts.body,
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 54,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 28px 0', boxSizing: 'border-box', zIndex: 50,
            fontFamily: EVE.fonts.ui, fontSize: 14, fontWeight: 600,
            color: t.ink, pointerEvents: 'none',
          }}>
            <div>9:41</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <svg width="16" height="10" viewBox="0 0 16 10"><g fill={t.ink}>
                <rect x="0" y="6" width="3" height="4" rx="0.5"/>
                <rect x="4.5" y="4" width="3" height="6" rx="0.5"/>
                <rect x="9" y="2" width="3" height="8" rx="0.5"/>
                <rect x="13.5" y="0" width="3" height="10" rx="0.5"/>
              </g></svg>
              <svg width="22" height="10" viewBox="0 0 22 10">
                <rect x="0.5" y="0.5" width="18" height="9" rx="2" fill="none" stroke={t.ink} strokeOpacity="0.5"/>
                <rect x="2" y="2" width="15" height="6" rx="1" fill={t.ink}/>
                <rect x="20" y="3.5" width="1.5" height="3" rx="0.5" fill={t.ink} fillOpacity="0.5"/>
              </svg>
            </div>
          </div>
          {children}
          <div style={{
            position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)',
            width: 134, height: 5, borderRadius: 999, zIndex: 60,
            background: dark ? 'rgba(245,235,218,0.4)' : 'rgba(31,26,20,0.35)',
          }} />
        </div>
      </div>
    </div>
  );
}

window.EvePhone = EvePhone;
