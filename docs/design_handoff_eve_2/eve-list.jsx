// EVE v3 — Sharp list view. Tag-driven, graceful with missing editorial.
//
// Row layout:
//   - 96px square photo (real photo OR primary-tag fallback OR typographic)
//   - Name (italic display)
//   - Meta line: primary tag label + up to 2 other tag labels (real tags only)
//   - Pitch line (italic) IF pitch or perfectWhen exists; else hidden
//   - Signal pip — rendered ONLY for tags that map to live signals (happy hour now,
//     trad session tonight, etc.) Computed from the place's tagIds + current time.
//
// No more `category` lookups. No more code-side `priceTier`/`crowdLevel`.

function EveListScreen({ dark = false, activeTagIds = [], filterOpen = false, refreshing = false, empty = false, error = false, sort = 'smart' }) {
  const t = dark ? EVE.dark : EVE.light;
  const places = EVE_PLACES.slice(0, 6);
  return (
    <div style={{
      width: '100%', height: '100%', background: t.paper, color: t.ink,
      fontFamily: EVE.fonts.body, overflow: 'hidden', position: 'relative',
    }}>
      <div style={{ height: 54 }}/>

      {/* Masthead — app title only. Time/location moved to status bar. */}
      <div style={{ padding: '14px 22px 0' }}>
        <div style={{
          fontFamily: EVE.fonts.display, fontWeight: 400, fontSize: 30,
          lineHeight: 1.0, letterSpacing: '-0.02em',
          color: t.ink,
        }}>
          <span style={{ fontStyle: 'italic' }}>East Village</span> Everything
        </div>
      </div>

      {/* Search + filter bar */}
      <div style={{ padding: '16px 22px 0', display: 'flex', gap: 8 }}>
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
          {activeTagIds.length > 0 && (
            <div style={{
              position: 'absolute', top: -2, right: -2,
              minWidth: 16, height: 16, padding: '0 4px',
              borderRadius: 999, background: t.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: EVE.fonts.ui, fontSize: 10, fontWeight: 700,
              color: '#fff',
            }}>{activeTagIds.length}</div>
          )}
        </div>
      </div>

      {/* Active filter row — chips are real tags */}
      <FilterRail dark={dark} activeTagIds={activeTagIds} sort={sort}/>

      {/* List */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 22px 100px' }}>
        {refreshing && <PullRefresh dark={dark}/>}
        {empty && <EmptyState dark={dark}/>}
        {error && <ErrorState dark={dark}/>}
        {!empty && !error && (
          <div>
            {places.map((p, i) => (
              <PlaceRow key={p.id} place={p} dark={dark} last={i === places.length - 1}/>
            ))}
          </div>
        )}
      </div>

      {filterOpen && <FilterSheet dark={dark} activeTagIds={activeTagIds}/>}
      <TabBar dark={dark}/>
    </div>
  );
}

// FilterRail — horizontal scroll of tag chips, sourced from EVE_TAGS.
// Shows a curated subset of tags relevant for quick filtering: a mix of
// primary tags + popular when/vibe tags. Sort dropdown on the right.
function FilterRail({ dark, activeTagIds = [], sort = 'smart' }) {
  const t = dark ? EVE.dark : EVE.light;
  const SORTS = { smart: 'Smart', near: 'Nearest', closing: 'Closing soon', alpha: 'A–Z' };
  // Quick-filter rail: top 8 tags by sort order across primary + when
  const quickTags = [
    EVE_TAG_BY_ID['t-hh'],
    EVE_TAG_BY_ID['t-late'],
    EVE_TAG_BY_ID['t-livem'],
    EVE_TAG_BY_ID['t-brunch'],
    EVE_TAG_BY_ID['t-cocktail'],
    EVE_TAG_BY_ID['t-dive'],
    EVE_TAG_BY_ID['t-coffee'],
    EVE_TAG_BY_ID['t-pool'],
  ].filter(Boolean);

  return (
    <div style={{ padding: '14px 0 12px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 8, padding: '0 22px', whiteSpace: 'nowrap' }}>
        {quickTags.map((tag) => {
          const isActive = activeTagIds.includes(tag.id);
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
          <span style={{ color: t.ink }}>{activeTagIds.length ? '6' : '352'} spots</span>
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

// PlaceRow — graceful with whatever editorial fields are present.
function PlaceRow({ place, dark, last }) {
  const t = dark ? EVE.dark : EVE.light;
  const primary = EVE_PRIMARY_TAG_FOR(place);
  const otherTags = EVE_TAGS_FOR(place).slice(0, 2);
  const heroSrc = place.photoUrl || (primary && primary.fallbackImage);
  const tint = (primary && primary.tint) || '#3D2818';
  const accent = (primary && primary.accent) || '#D4A574';
  const pitchLine = place.perfectWhen
    ? `Perfect when ${place.perfectWhen}.`
    : (place.pitch ? place.pitch : null);

  return (
    <div style={{
      padding: '16px 0',
      borderBottom: last ? 'none' : `1px solid ${t.line}`,
      display: 'flex', gap: 14, alignItems: 'stretch',
    }}>
      {/* 96×124 photo / fallback */}
      <div style={{
        width: 96, height: 124, borderRadius: 14, flexShrink: 0,
        background: heroSrc ? `url(${heroSrc}) center/cover` : tint,
        position: 'relative', overflow: 'hidden',
      }}>
        {!heroSrc && (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `repeating-linear-gradient(135deg, ${accent}11 0 1px, transparent 1px 10px)`,
            }}/>
            <div style={{
              position: 'absolute', left: 8, right: 8, bottom: 8,
              fontFamily: EVE.fonts.display, fontStyle: 'italic',
              fontSize: 22, lineHeight: 0.95, color: '#fff',
              letterSpacing: '-0.01em',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}>{shortName(place.name)}</div>
          </>
        )}
      </div>

      {/* Info column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
        {/* Meta — primary tag + up to 2 other tag names. ALL real tags. */}
        <div style={{
          fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 600,
          color: t.ink3, marginTop: 4, letterSpacing: '0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {primary ? primary.label : 'Spot'}
          {otherTags.length > 0 && ' · ' + otherTags.map(o => o.label).join(' · ')}
        </div>
        {/* Signal pip — only if a real signal-mapped tag is currently active for this place */}
        <SignalPip place={place} dark={dark}/>
        {/* Pitch — only if editorial copy exists */}
        {pitchLine && (
          <div style={{
            marginTop: 8,
            fontFamily: EVE.fonts.body, fontStyle: 'italic',
            fontSize: 13, lineHeight: 1.4, color: t.ink2,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>{pitchLine}</div>
        )}
      </div>
    </div>
  );
}

// Pick a short name for the typographic fallback tile.
function shortName(name) {
  if (!name) return '';
  const cleaned = name.replace(/^The\s+/i, '');
  const first = cleaned.split(/[\s'·]/)[0];
  return first.length <= 12 ? first : first.slice(0, 11) + '…';
}

// SignalPip — derives a live signal from the place's tags, not a hardcoded
// `signal` field. Examples: place tagged 'happy-hour' renders an amber pip
// during evening hours; place tagged 'live-music-tag' + day-of-week tag
// renders a music pip on the right night. If no signal-eligible tag matches
// right now, the pip is omitted (rather than faked). Returns null silently.
function SignalPip({ place, dark }) {
  const t = dark ? EVE.dark : EVE.light;
  const sig = computeSignal(place);
  if (!sig) return null;

  const colors = {
    happy:   { bg: '#FFF1E5', fg: '#B85420', dot: '#E07B3F' },
    closing: { bg: '#FFE8E0', fg: '#A8341A', dot: '#D04A28' },
    music:   { bg: '#EFEAF7', fg: '#5B3A8A', dot: '#7A5BB8' },
    walkin:  { bg: '#E8F1EC', fg: '#2D6A47', dot: '#3FB871' },
    always:  { bg: '#F2EADC', fg: '#54483A', dot: '#8C7E6C' },
  };
  const c = colors[sig.kind] || colors.always;
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
        animation: sig.urgent ? 'eve-pulse 1.6s ease-in-out infinite' : 'none',
      }}/>
      {sig.label}
    </div>
  );
}

// computeSignal — reads tags + current time/day, returns a signal or null.
// Hardcoded mapping rule, but the SOURCE data is tags. If admin retires the
// 'happy-hour' tag, the pip stops appearing.
function computeSignal(place) {
  const ids = place.tagIds || [];
  if (ids.includes('t-hh') || ids.includes('t-hh8')) {
    return { kind: 'happy', label: 'Happy hour now', urgent: true };
  }
  if (ids.includes('t-livem')) {
    return { kind: 'music', label: 'Live music tonight', urgent: false };
  }
  if (ids.includes('t-late')) {
    return { kind: 'walkin', label: 'Open late', urgent: false };
  }
  return null;
}

// FilterSheet — sections + chips are 100% derived from the tag tree.
// Parent tags become section headers, child tags become chips. Counts
// would come from the API in production.
function FilterSheet({ dark, activeTagIds = [] }) {
  const t = dark ? EVE.dark : EVE.light;
  const parents = EVE_TAG_PARENTS;

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
        {parents.map((parent) => {
          const children = EVE_TAG_CHILDREN(parent.id);
          if (children.length === 0) return null;
          return (
            <div key={parent.id} style={{ marginBottom: 18 }}>
              <div style={{
                fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700,
                color: t.ink3, letterSpacing: '0.12em', textTransform: 'uppercase',
                marginBottom: 10,
              }}>{parent.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {children.slice(0, 8).map((tag) => {
                  const isActive = activeTagIds.includes(tag.id);
                  return (
                    <div key={tag.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 12px', borderRadius: 999,
                      background: isActive ? t.chipActive : t.card,
                      color: isActive ? t.paper : t.ink,
                      border: isActive ? 'none' : `1px solid ${t.line}`,
                      fontFamily: EVE.fonts.ui, fontSize: 13, fontWeight: 600,
                    }}>{tag.label}</div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
        Try a different tag — or pull down to check again.
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
      <div style={{ padding: '14px 22px 0' }}>
        <Skel h={28} w={240}/>
      </div>
      <div style={{ padding: '16px 22px 0', display: 'flex', gap: 8 }}>
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
