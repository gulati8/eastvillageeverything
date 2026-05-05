// EVE v3 — Sharp list view. Decision-quality at a glance.
// Layout: 96px square photo + dense info column. Live signal pip,
// distance, vibe, price, "perfect when". One row = one decision made.

function EveListScreen({ dark = false, activeFilters = ['tonight'], filterOpen = false, refreshing = false, empty = false, error = false, sort = 'smart' }) {
  const t = dark ? EVE.dark : EVE.light;
  return (
    <div style={{
      width: '100%', height: '100%', background: t.paper, color: t.ink,
      fontFamily: EVE.fonts.body, overflow: 'hidden', position: 'relative',
    }}>
      <div style={{ height: 54 }}/>

      {/* Compact masthead — friend voice, but smaller so the list breathes */}
      <div style={{ padding: '12px 22px 0' }}>
        <div style={{
          fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 600,
          color: t.ink3, letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Tue · 6:38pm · East Village</div>
        <div style={{
          fontFamily: EVE.fonts.display, fontWeight: 400, fontSize: 32,
          lineHeight: 1.0, letterSpacing: '-0.02em', marginTop: 6,
          color: t.ink,
        }}>
          <span style={{ fontStyle: 'italic' }}>47 spots</span> open near you.
        </div>
      </div>

      {/* Search + filter bar */}
      <div style={{ padding: '14px 22px 0', display: 'flex', gap: 8 }}>
        <div style={{
          flex: 1, height: 40, borderRadius: 999,
          background: t.card, border: `1px solid ${t.line}`,
          display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke={t.ink3} strokeWidth="1.5"/>
            <path d="M9.5 9.5L13 13" stroke={t.ink3} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div style={{ fontFamily: EVE.fonts.ui, fontSize: 13, color: t.ink3 }}>
            Search a name or a feeling
          </div>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 999, background: t.card,
          border: `1px solid ${t.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 3h10M4 7h6M5.5 11h3" stroke={t.ink} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {activeFilters.length > 1 && (
            <div style={{
              position: 'absolute', top: -2, right: -2,
              minWidth: 16, height: 16, padding: '0 4px',
              borderRadius: 999, background: t.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: EVE.fonts.ui, fontSize: 10, fontWeight: 700,
              color: '#fff',
            }}>{activeFilters.length}</div>
          )}
        </div>
      </div>

      {/* Active filter row — chips show what's currently applied + counts */}
      <FilterRail dark={dark} active={activeFilters} sort={sort}/>

      {/* List */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 22px 100px' }}>
        {refreshing && <PullRefresh dark={dark}/>}
        {empty && <EmptyState dark={dark}/>}
        {error && <ErrorState dark={dark}/>}
        {!empty && !error && (
          <div>
            {EVE_PLACES.slice(0, 6).map((p, i) => (
              <PlaceRow key={p.id} place={p} dark={dark} last={i === 5}/>
            ))}
          </div>
        )}
      </div>

      {filterOpen && <FilterSheet dark={dark} active={activeFilters}/>}
      <TabBar dark={dark}/>
    </div>
  );
}

// Sharp filter rail — the active filter is a contained pill, the rest are
// a horizontal mood scroll. Sort is on the right.
function FilterRail({ dark, active = [], sort = 'smart' }) {
  const t = dark ? EVE.dark : EVE.light;
  const SORTS = { smart: "Smart", near: 'Nearest', closing: 'Closing soon', alpha: 'A–Z' };
  return (
    <div style={{ padding: '14px 0 12px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 8, padding: '0 22px', whiteSpace: 'nowrap' }}>
        {EVE_TAGS.map((tag) => {
          const isActive = active.includes(tag.id);
          return (
            <div key={tag.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 999,
              fontFamily: EVE.fonts.ui, fontSize: 13, fontWeight: 600,
              background: isActive ? t.chipActive : t.chip,
              color: isActive ? t.paper : t.ink,
              border: isActive ? 'none' : `1px solid ${t.line}`,
            }}>
              {tag.label}
              {isActive && <span style={{ opacity: 0.6, fontSize: 14, lineHeight: 1 }}>×</span>}
            </div>
          );
        })}
      </div>
      <div style={{
        marginTop: 10, padding: '0 22px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{
          fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 600,
          color: t.ink3, letterSpacing: '0.04em',
        }}>
          <span style={{ color: t.ink }}>6 of 47</span> match · within 10 min walk
        </div>
        <div style={{
          fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700,
          color: t.ink2, letterSpacing: '0.06em', textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          {SORTS[sort]}
          <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 3l3 3 3-3" stroke={t.ink2} strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
        </div>
      </div>
    </div>
  );
}

// PlaceRow — the heart of the sharp list view. Photo + signal + decision.
function PlaceRow({ place, dark, last }) {
  const t = dark ? EVE.dark : EVE.light;
  const cat = EVE_CATEGORIES[place.category] || EVE_CATEGORIES.dive;
  const heroSrc = place.photo || cat.photo;
  return (
    <div style={{
      padding: '16px 0',
      borderBottom: last ? 'none' : `1px solid ${t.line}`,
      display: 'flex', gap: 14, alignItems: 'stretch',
    }}>
      {/* Square photo / fallback */}
      <div style={{
        width: 96, height: 124, borderRadius: 14, flexShrink: 0,
        background: place.photo ? `url(${heroSrc}) center/cover` : cat.tint,
        position: 'relative', overflow: 'hidden',
      }}>
        {!place.photo && (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `repeating-linear-gradient(135deg, ${cat.accent}11 0 1px, transparent 1px 10px)`,
            }}/>
            <div style={{
              position: 'absolute', left: 8, right: 8, bottom: 8,
              fontFamily: EVE.fonts.display, fontStyle: 'italic',
              fontSize: 16, lineHeight: 1.0, color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}>{place.name.split(/['\s]/)[0]}</div>
          </>
        )}
        {/* Distance badge */}
        <div style={{
          position: 'absolute', top: 6, left: 6,
          padding: '3px 7px', borderRadius: 999,
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
          fontFamily: EVE.fonts.ui, fontSize: 10, fontWeight: 700,
          color: '#1F1A14', letterSpacing: '0.02em',
        }}>{place.distance}</div>
      </div>

      {/* Info column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top row — name + save */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <div style={{
            fontFamily: EVE.fonts.display, fontStyle: 'italic',
            fontWeight: 400, fontSize: 22, lineHeight: 1.0,
            letterSpacing: '-0.01em', color: t.ink,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{place.name}</div>
          <svg width="14" height="16" viewBox="0 0 14 16" style={{ flexShrink: 0, marginTop: 2 }} fill="none">
            <path d="M2 1h10v13l-5-3.5L2 14V1z" stroke={t.ink3} strokeWidth="1.4"/>
          </svg>
        </div>
        {/* Meta */}
        <div style={{
          fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 600,
          color: t.ink3, marginTop: 4, letterSpacing: '0.01em',
        }}>
          {cat.label} · {place.priceTier} · {place.crowdLevel}
        </div>
        {/* Signal — the star of the row */}
        <SignalPip signal={place.signal} dark={dark}/>
        {/* Pitch line — one sentence, italic, friend voice */}
        <div style={{
          marginTop: 8,
          fontFamily: EVE.fonts.body, fontStyle: 'italic',
          fontSize: 13, lineHeight: 1.4, color: t.ink2,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {place.perfect.charAt(0).toUpperCase() + place.perfect.slice(1)}.
        </div>
      </div>
    </div>
  );
}

// Signal pip — context-aware: happy hour countdown, closing soon,
// trad session starting, walk-ins after 11. The decision-driver.
function SignalPip({ signal, dark }) {
  const t = dark ? EVE.dark : EVE.light;
  if (!signal) return null;
  const colors = {
    happy:   { bg: '#FFF1E5', fg: '#B85420', dot: '#E07B3F' },  // amber
    closing: { bg: '#FFE8E0', fg: '#A8341A', dot: '#D04A28' },  // red-amber
    music:   { bg: '#EFEAF7', fg: '#5B3A8A', dot: '#7A5BB8' },  // violet
    walkin:  { bg: '#E8F1EC', fg: '#2D6A47', dot: '#3FB871' },  // green
    always:  { bg: '#F2EADC', fg: '#54483A', dot: '#8C7E6C' },  // neutral
  };
  const c = colors[signal.kind] || colors.always;
  return (
    <div style={{
      marginTop: 8, display: 'inline-flex', alignSelf: 'flex-start',
      alignItems: 'center', gap: 6,
      padding: '4px 9px', borderRadius: 999,
      background: dark ? `${c.dot}22` : c.bg,
      fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700,
      color: dark ? c.dot : c.fg, letterSpacing: '0.01em',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 999, background: c.dot,
        animation: signal.urgent ? 'eve-pulse 1.6s ease-in-out infinite' : 'none',
      }}/>
      {signal.label}
    </div>
  );
}

// Filter sheet — rich, multi-select, with section grouping.
function FilterSheet({ dark, active = [] }) {
  const t = dark ? EVE.dark : EVE.light;
  const sections = [
    { title: "What's the move", chips: [
      { id: 'happy',   label: 'Happy hour',     count: 12 },
      { id: 'music',   label: 'Live music',     count: 4 },
      { id: 'date',    label: 'Date night',     count: 18 },
      { id: 'closing', label: 'Closing soon',   count: 6 },
      { id: 'walkin',  label: 'Walk-ins',       count: 23 },
    ]},
    { title: 'Type', chips: [
      { id: 'cocktail', label: 'Cocktails',  count: 14 },
      { id: 'dive',     label: 'Dive',       count: 9 },
      { id: 'wine',     label: 'Wine',       count: 7 },
      { id: 'beer',     label: 'Beer',       count: 11 },
      { id: 'coffee',   label: 'Coffee',     count: 8 },
      { id: 'food',     label: 'Food',       count: 31 },
    ]},
    { title: 'When', chips: [
      { id: 'now',     label: 'Open now',      count: 47 },
      { id: 'late',    label: 'Open after 12', count: 22 },
      { id: '24h',     label: '24 hours',      count: 3 },
      { id: 'brunch',  label: 'Brunch',        count: 14 },
    ]},
    { title: 'Price', chips: [
      { id: '$',   label: '$ Cheap',     count: 18 },
      { id: '$$',  label: '$$ Mid',      count: 21 },
      { id: '$$$', label: '$$$ Splurge', count: 8 },
    ]},
    { title: 'Vibe', chips: [
      { id: 'loud',   label: 'Loud',     count: 12 },
      { id: 'quiet',  label: 'Quiet',    count: 9 },
      { id: 'cash',   label: 'Cash only', count: 6 },
      { id: 'solo',   label: 'Good solo', count: 14 },
      { id: 'group',  label: 'Big group', count: 11 },
    ]},
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      height: '76%', background: t.paper,
      borderRadius: '24px 24px 0 0',
      boxShadow: '0 -16px 40px rgba(0,0,0,0.18)',
      zIndex: 80, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: t.ink3, opacity: 0.5 }}/>
      </div>
      <div style={{ padding: '4px 22px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontFamily: EVE.fonts.ui, fontSize: 13, fontWeight: 600, color: t.ink2 }}>Clear all</div>
        <div style={{
          fontFamily: EVE.fonts.display, fontStyle: 'italic',
          fontSize: 22, color: t.ink, letterSpacing: '-0.005em',
        }}>What are you in the mood for?</div>
        <div style={{ fontFamily: EVE.fonts.ui, fontSize: 13, fontWeight: 700, color: t.accentDeep }}>Done</div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 22px' }}>
        {sections.map((sec) => (
          <div key={sec.title} style={{ marginBottom: 18 }}>
            <div style={{
              fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700,
              color: t.ink3, letterSpacing: '0.12em', textTransform: 'uppercase',
              marginBottom: 10,
            }}>{sec.title}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sec.chips.map((c) => {
                const isActive = active.includes(c.id);
                return (
                  <div key={c.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', borderRadius: 999,
                    background: isActive ? t.chipActive : t.card,
                    color: isActive ? t.paper : t.ink,
                    border: isActive ? 'none' : `1px solid ${t.line}`,
                    fontFamily: EVE.fonts.ui, fontSize: 13, fontWeight: 600,
                  }}>
                    {c.label}
                    <span style={{
                      fontFamily: EVE.fonts.ui, fontSize: 10, fontWeight: 600,
                      color: isActive ? 'rgba(255,255,255,0.7)' : t.ink3,
                    }}>{c.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        padding: '14px 18px 28px',
        background: t.paper, borderTop: `1px solid ${t.line}`,
      }}>
        <button style={{
          width: '100%', padding: '14px', borderRadius: 999, border: 'none',
          background: t.ink, color: t.paper,
          fontFamily: EVE.fonts.ui, fontSize: 14, fontWeight: 700,
        }}>Show 23 spots</button>
      </div>
    </div>
  );
}

function TabBar({ dark }) {
  const t = dark ? EVE.dark : EVE.light;
  const Item = ({ label, active }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
      <div style={{ width: 6, height: 6, borderRadius: 999, background: active ? t.accent : 'transparent' }}/>
      <div style={{
        fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 600,
        color: active ? t.ink : t.ink3, letterSpacing: '0.02em',
      }}>{label}</div>
    </div>
  );
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, height: 76,
      background: dark ? 'rgba(22,17,12,0.92)' : 'rgba(251,246,238,0.92)',
      borderTop: `1px solid ${t.line}`,
      display: 'flex', alignItems: 'center', padding: '8px 22px 24px',
      backdropFilter: 'blur(12px)', zIndex: 70,
    }}>
      <Item label="Tonight" active/>
      <Item label="Saved"/>
      <Item label="Map"/>
      <Item label="You"/>
    </div>
  );
}

function PullRefresh({ dark }) {
  const t = dark ? EVE.dark : EVE.light;
  return (
    <div style={{ padding: '16px 0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 18, height: 18, borderRadius: 999,
        border: `2px solid ${t.accent}`, borderRightColor: 'transparent',
        animation: 'eve-spin 0.9s linear infinite',
      }}/>
      <div style={{ fontFamily: EVE.fonts.body, fontStyle: 'italic', fontSize: 14, color: t.ink2 }}>
        Checking what's open…
      </div>
    </div>
  );
}

function EmptyState({ dark }) {
  const t = dark ? EVE.dark : EVE.light;
  return (
    <div style={{ padding: '48px 22px', textAlign: 'center' }}>
      <div style={{
        fontFamily: EVE.fonts.display, fontStyle: 'italic',
        fontSize: 32, lineHeight: 1.05, color: t.ink, letterSpacing: '-0.01em',
      }}>
        Nothing's matching <br/>that vibe right now.
      </div>
      <div style={{
        marginTop: 14, fontFamily: EVE.fonts.body, fontSize: 15,
        color: t.ink2, lineHeight: 1.5, maxWidth: 280, marginInline: 'auto',
      }}>
        Try a different mood — or pull down to check again.
      </div>
      <div style={{
        marginTop: 22, display: 'inline-flex', padding: '10px 18px', borderRadius: 999,
        background: t.ink, color: t.paper,
        fontFamily: EVE.fonts.ui, fontSize: 13, fontWeight: 600,
      }}>Show me everything</div>
    </div>
  );
}

function ErrorState({ dark }) {
  const t = dark ? EVE.dark : EVE.light;
  return (
    <div style={{ padding: '48px 22px', textAlign: 'center' }}>
      <div style={{
        fontFamily: EVE.fonts.display, fontStyle: 'italic',
        fontSize: 28, lineHeight: 1.05, color: t.ink, letterSpacing: '-0.01em',
      }}>
        We lost the signal somewhere on Avenue B.
      </div>
      <div style={{
        marginTop: 14, fontFamily: EVE.fonts.body, fontSize: 15,
        color: t.ink2, lineHeight: 1.5, maxWidth: 280, marginInline: 'auto',
      }}>
        Check your connection and pull to try again. We'll be here.
      </div>
    </div>
  );
}

function EveListSkeleton({ dark = false }) {
  const t = dark ? EVE.dark : EVE.light;
  const Skel = ({ h, w = '100%', r = 8 }) => (
    <div style={{ height: h, width: w, borderRadius: r,
      background: t.paper2, animation: 'eve-pulse 1.4s ease-in-out infinite' }}/>
  );
  return (
    <div style={{ width: '100%', height: '100%', background: t.paper, position: 'relative', overflow: 'hidden' }}>
      <div style={{ height: 54 }}/>
      <div style={{ padding: '12px 22px 0' }}>
        <Skel h={10} w={140}/><div style={{ height: 10 }}/>
        <Skel h={28} w={240}/>
      </div>
      <div style={{ padding: '14px 22px 0', display: 'flex', gap: 8 }}>
        <Skel h={40} w={'78%'} r={999}/>
        <Skel h={40} w={40} r={999}/>
      </div>
      <div style={{ padding: '14px 22px 0', display: 'flex', gap: 8 }}>
        {[80,90,70,84].map((w,i)=><Skel key={i} h={32} w={w} r={999}/>)}
      </div>
      <div style={{ padding: '6px 22px 0' }}>
        {[0,1,2,3].map((i)=> (
          <div key={i} style={{ padding: '16px 0', borderBottom: `1px solid ${t.line}`, display: 'flex', gap: 14 }}>
            <Skel h={124} w={96} r={14}/>
            <div style={{ flex: 1 }}>
              <Skel h={20} w={140}/><div style={{ height: 8 }}/>
              <Skel h={10} w={180}/><div style={{ height: 14 }}/>
              <Skel h={20} w={150} r={999}/><div style={{ height: 12 }}/>
              <Skel h={11} w={'92%'}/><div style={{ height: 6 }}/>
              <Skel h={11} w={'70%'}/>
            </div>
          </div>
        ))}
      </div>
      <TabBar dark={dark}/>
    </div>
  );
}

Object.assign(window, { EveListScreen, EveListSkeleton, PlaceRow, SignalPip, FilterRail, FilterSheet, TabBar });
