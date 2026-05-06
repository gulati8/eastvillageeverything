// EVE v3 — Admin web UI redesigns. These render at desktop scale (~1280×800)
// inside a browser-window starter component on the design canvas.
//
// Three screens:
//   1. AdminPlacesList — sortable table replaced with editorial-completeness
//      list. Shows what's missing per place so admins can triage writing.
//   2. AdminEditPlace — friend-voice editorial form on the left, LIVE mobile
//      preview on the right showing exactly how this place will appear in
//      the feed as you type.
//   3. AdminTags — parent/child tree view, primary-tag toggle, fallback
//      image upload, drag-to-reorder.
//
// Visual language: warm, editorial, NOT generic-Bootstrap. Same fonts as the
// mobile app so the admin feels like part of the product, not a CMS bolted on.

// ─── Shared admin chrome ──────────────────────────────────────────────────

function AdminFrame({ active = 'places', children }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: '#FBF6EE',
      fontFamily: EVE.fonts.ui, color: '#1F1A14', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <AdminNav active={active}/>
      <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function AdminNav({ active }) {
  const Item = ({ id, label }) => (
    <div style={{
      padding: '8px 16px', borderRadius: 999,
      fontFamily: EVE.fonts.ui, fontSize: 13, fontWeight: 600,
      background: active === id ? '#1F1A14' : 'transparent',
      color: active === id ? '#FBF6EE' : '#1F1A14',
      letterSpacing: '0.01em',
    }}>{label}</div>
  );
  return (
    <div style={{
      height: 64, background: '#FFFFFF',
      borderBottom: '1px solid rgba(31,26,20,0.08)',
      display: 'flex', alignItems: 'center', padding: '0 32px', gap: 32,
    }}>
      <div style={{
        fontFamily: EVE.fonts.display, fontSize: 22, fontStyle: 'italic',
        color: '#1F1A14', letterSpacing: '-0.01em',
      }}>EVE Admin</div>
      <div style={{ display: 'flex', gap: 4 }}>
        <Item id="places" label="Places"/>
        <Item id="tags" label="Tags"/>
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{
        fontFamily: EVE.fonts.ui, fontSize: 12, fontWeight: 500,
        color: '#8C7E6C', letterSpacing: '0.02em',
      }}>Nicholas VanderBorgh</div>
      <div style={{
        padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(31,26,20,0.18)',
        fontFamily: EVE.fonts.ui, fontSize: 12, fontWeight: 600,
      }}>Logout</div>
    </div>
  );
}

// ─── 1. PLACES LIST ───────────────────────────────────────────────────────
// Triage-first: sort by completeness, show what's missing per place. The
// editorial-completeness pip is the leverage point — admins want to know
// "what should I write next" not "what places do I have."

function AdminPlacesList() {
  const allPlaces = EVE_PLACES;
  return (
    <AdminFrame active="places">
      <div style={{ padding: '36px 48px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{
              fontFamily: EVE.fonts.display, fontStyle: 'italic',
              fontSize: 44, lineHeight: 1.0, letterSpacing: '-0.02em',
            }}>Places</div>
            <div style={{
              marginTop: 8, fontFamily: EVE.fonts.body, fontSize: 14, color: '#54483A', maxWidth: 520, lineHeight: 1.5,
            }}>352 spots in the database. <strong>4 fully written.</strong> The list below is sorted by what needs your attention most.</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <SearchInput placeholder="Search a place"/>
            <PrimaryBtn>+ New place</PrimaryBtn>
          </div>
        </div>

        {/* Triage filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <FilterPill active count={352}>All</FilterPill>
          <FilterPill count={348} tone="warning">Missing pitch</FilterPill>
          <FilterPill count={350} tone="warning">No photo</FilterPill>
          <FilterPill count={2} tone="alert">No primary tag</FilterPill>
          <FilterPill count={4} tone="success">Ready to publish</FilterPill>
          <div style={{ flex: 1 }}/>
          <div style={{ fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700, color: '#8C7E6C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sort: Least complete first ▾</div>
        </div>

        {/* Table */}
        <div style={{
          flex: 1, overflow: 'hidden', borderRadius: 14,
          border: '1px solid rgba(31,26,20,0.08)', background: '#FFF',
        }}>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '64px 1.4fr 1fr 1.6fr 120px 120px',
            padding: '14px 20px', borderBottom: '1px solid rgba(31,26,20,0.08)',
            fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700,
            color: '#8C7E6C', letterSpacing: '0.1em', textTransform: 'uppercase',
            background: '#FBF6EE',
          }}>
            <div>Photo</div>
            <div>Name</div>
            <div>Primary tag</div>
            <div>Editorial</div>
            <div style={{ textAlign: 'right' }}>Updated</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
          </div>
          {/* Rows */}
          <div style={{ overflow: 'auto', height: 'calc(100% - 44px)' }}>
            {allPlaces.map((p) => <AdminPlaceRow key={p.id} place={p}/>)}
            {/* Some additional skeleton placeholder rows to suggest the table continues */}
            {[1,2,3,4,5,6,7].map((i) => (
              <AdminPlaceRow key={'p'+i} place={{
                id: 100+i, name: ['Ace Bar','Alphabet City Beer Co.','Amor y Amargo','Amsterdam Billiard Club','Angel\'s Share','Apiary','Artichoke'][i-1],
                primaryTagId: i % 2 === 0 ? 't-cocktail' : 't-pub',
                tagIds: [],
                photoUrl: null,
              }}/>
            ))}
          </div>
        </div>
      </div>
    </AdminFrame>
  );
}

function AdminPlaceRow({ place }) {
  const primary = EVE_PRIMARY_TAG_FOR(place);
  const completeness = EVE_COMPLETENESS(place);
  const hasPhoto = !!place.photoUrl;
  const heroSrc = place.photoUrl || (primary && primary.fallbackImage);
  const tint = (primary && primary.tint) || '#3D2818';

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '64px 1.4fr 1fr 1.6fr 120px 120px',
      padding: '14px 20px', borderBottom: '1px solid rgba(31,26,20,0.06)',
      alignItems: 'center', gap: 16,
    }}>
      {/* Photo */}
      <div style={{
        width: 44, height: 44, borderRadius: 8, flexShrink: 0,
        background: heroSrc ? `url(${heroSrc}) center/cover` : tint,
        opacity: hasPhoto ? 1 : 0.7,
      }}/>
      {/* Name */}
      <div>
        <div style={{ fontFamily: EVE.fonts.display, fontStyle: 'italic', fontSize: 17, color: '#1F1A14', letterSpacing: '-0.005em' }}>{place.name}</div>
        {place.address && <div style={{ fontFamily: EVE.fonts.ui, fontSize: 11, color: '#8C7E6C', marginTop: 2 }}>{place.address}</div>}
      </div>
      {/* Primary tag */}
      <div>
        {primary ? (
          <div style={{
            display: 'inline-block', padding: '4px 10px', borderRadius: 999,
            background: '#F2EADC', color: '#54483A',
            fontFamily: EVE.fonts.ui, fontSize: 12, fontWeight: 600,
          }}>{primary.label}</div>
        ) : (
          <div style={{
            display: 'inline-block', padding: '4px 10px', borderRadius: 999,
            background: '#FFE8E0', color: '#A8341A',
            fontFamily: EVE.fonts.ui, fontSize: 12, fontWeight: 600,
          }}>None — set one</div>
        )}
      </div>
      {/* Editorial completeness */}
      <CompletenessRow place={place} completeness={completeness}/>
      {/* Updated */}
      <div style={{ textAlign: 'right', fontFamily: EVE.fonts.ui, fontSize: 12, color: '#8C7E6C' }}>Jan 29</div>
      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <SmallBtn tone="primary">Edit</SmallBtn>
        <SmallBtn tone="ghost">⋯</SmallBtn>
      </div>
    </div>
  );
}

function CompletenessRow({ place, completeness }) {
  const FIELDS = [
    { key: 'photoUrl',    label: 'Photo' },
    { key: 'pitch',       label: 'Pitch' },
    { key: 'perfectWhen', label: 'Perfect' },
    { key: 'insiderTip',  label: 'Tip' },
    { key: 'vibe',        label: 'Vibe' },
    { key: 'crowd',       label: 'Crowd' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700,
        color: completeness.filled === 0 ? '#A8341A' : completeness.filled === completeness.total ? '#2D6A47' : '#8C7E6C',
        letterSpacing: '0.04em', minWidth: 24,
      }}>{completeness.filled}/{completeness.total}</div>
      <div style={{ display: 'flex', gap: 3 }}>
        {FIELDS.map((f) => {
          const filled = !!place[f.key];
          return (
            <div key={f.key} title={f.label} style={{
              width: 18, height: 6, borderRadius: 3,
              background: filled ? '#3FB871' : 'rgba(31,26,20,0.10)',
            }}/>
          );
        })}
      </div>
    </div>
  );
}

// ─── 2. EDIT PLACE ────────────────────────────────────────────────────────
// Two-column: form on the left, live mobile preview on the right.
// Primary-tag dropdown (filtered to isPrimary tags) replaces "Categories".
// All "other" tags are checkboxes grouped by parent — DERIVED FROM TAG TREE,
// not hardcoded sections in the form code.

function AdminEditPlace({ place = EVE_PLACES[4] }) {
  const primary = EVE_PRIMARY_TAG_FOR(place);
  return (
    <AdminFrame active="places">
      <div style={{
        padding: '32px 48px', height: '100%', overflow: 'hidden',
        display: 'grid', gridTemplateColumns: '1fr 440px', gap: 32,
      }}>
        {/* LEFT — form */}
        <div style={{ overflow: 'auto', paddingRight: 8 }}>
          {/* Header */}
          <div style={{ marginBottom: 22, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: EVE.fonts.ui, fontSize: 12, color: '#8C7E6C' }}>Places</div>
            <div style={{ color: '#8C7E6C' }}>›</div>
            <div style={{
              fontFamily: EVE.fonts.display, fontStyle: 'italic',
              fontSize: 36, lineHeight: 1.0, letterSpacing: '-0.02em',
            }}>{place.name}</div>
          </div>

          {/* Identity section */}
          <FormSection title="Identity" subtitle="Name, address, contact. The dry stuff.">
            <FormRow>
              <Field label="Name" value={place.name}/>
              <Field label="Phone" value={place.phone || ''} placeholder="(212) ..."/>
            </FormRow>
            <FormRow>
              <Field label="Address" value={place.address || ''}/>
              <Field label="Cross street" value={place.cross || ''} placeholder="btwn Aves A & B"/>
            </FormRow>
            <Field label="Website" value={place.website || ''} placeholder="https://..."/>
          </FormSection>

          {/* Taxonomy */}
          <FormSection title="Taxonomy" subtitle="Primary tag drives the headline + fallback image. Other tags drive filters and pips.">
            <FormRow>
              <FieldSelect label="Primary tag" value={primary ? primary.label : '— Choose one —'} required hint="Filtered to primary-eligible tags only. Manage at /admin/tags."/>
              <Field label="Status" value="Live" placeholder=""/>
            </FormRow>
            <TagTreePicker selectedIds={place.tagIds || []}/>
          </FormSection>

          {/* Editorial */}
          <FormSection title="Editorial" subtitle="The friend voice. Optional, but this is what makes this app worth opening." accent>
            <Field
              label="Pitch"
              value={place.pitch || ''}
              placeholder="Two sentences, friend voice. What is this place actually like? Why would I go?"
              multiline limit={220}
              example="The jukebox is the whole personality. Go on a Tuesday — it gets weird in the best way, and your $4 PBR will somehow taste like the meaning of life."
            />
            <FormRow>
              <Field
                label="Perfect when…"
                value={place.perfectWhen || ''}
                placeholder="you want to..."
                hint="Finishes the sentence 'Perfect when…' — keep it specific."
                example="you want to talk for hours and not look at a menu"
              />
              <Field
                label="Insider tip"
                value={place.insiderTip || ''}
                placeholder="Order the..."
                hint="One sentence. The thing you'd tell a friend over text."
                example="Cortado + olive-oil cake. Get there before 10 or after 2."
              />
            </FormRow>
            <FormRow>
              <Field label="Vibe" value={place.vibe || ''} placeholder="Three words separated by ·" example="Loud · Cash only · No frills"/>
              <Field label="Who's there" value={place.crowd || ''} placeholder="Locals, ..." example="Locals, NYU grads who never left"/>
            </FormRow>
          </FormSection>

          {/* Photo */}
          <FormSection title="Photo" subtitle="A real shot from inside. Until uploaded, the primary-tag fallback shows.">
            <PhotoUploadField place={place}/>
          </FormSection>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 20, borderTop: '1px solid rgba(31,26,20,0.08)', marginTop: 12 }}>
            <PrimaryBtn>Save changes</PrimaryBtn>
            <SecondaryBtn>Cancel</SecondaryBtn>
            <div style={{ flex: 1 }}/>
            <SecondaryBtn tone="danger">Delete place</SecondaryBtn>
          </div>
        </div>

        {/* RIGHT — live preview */}
        <div style={{ position: 'sticky', top: 0, alignSelf: 'start' }}>
          <div style={{
            fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700,
            color: '#8C7E6C', letterSpacing: '0.12em', textTransform: 'uppercase',
            marginBottom: 14,
          }}>Live preview</div>
          <PreviewPhone>
            <div style={{ width: '100%', height: '100%', background: '#FBF6EE', overflow: 'hidden' }}>
              <div style={{ height: 54 }}/>
              <div style={{ padding: '14px 22px 0' }}>
                <div style={{
                  fontFamily: EVE.fonts.display, fontWeight: 400, fontSize: 26,
                  lineHeight: 1.0, letterSpacing: '-0.02em', color: '#1F1A14',
                }}>
                  <span style={{ fontStyle: 'italic' }}>East Village</span> Everything
                </div>
              </div>
              <div style={{ padding: '20px 22px 0' }}>
                <PlaceRow place={place} dark={false} last={true}/>
              </div>
              <div style={{ padding: '4px 22px', fontFamily: EVE.fonts.ui, fontSize: 10, color: '#8C7E6C', fontStyle: 'italic' }}>
                ↑ This is exactly how it appears in the feed.
              </div>
              <div style={{ marginTop: 18, padding: '0 22px' }}>
                <div style={{
                  fontFamily: EVE.fonts.ui, fontSize: 10, fontWeight: 700,
                  color: '#8C7E6C', letterSpacing: '0.12em', textTransform: 'uppercase',
                  marginBottom: 8,
                }}>And the detail screen</div>
                <div style={{ height: 480, borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 24px rgba(31,26,20,0.08)' }}>
                  <div style={{ transform: 'scale(0.78)', transformOrigin: 'top left', width: 480, height: 615 }}>
                    <EveDetailScreen dark={false} place={place}/>
                  </div>
                </div>
              </div>
            </div>
          </PreviewPhone>
        </div>
      </div>
    </AdminFrame>
  );
}

function PreviewPhone({ children }) {
  return (
    <div style={{
      width: 388, height: 720, borderRadius: 38, padding: 8,
      background: '#1F1A14',
      boxShadow: '0 12px 40px rgba(31,26,20,0.25)',
    }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 30, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

// Tag tree picker — sections + checkboxes 100% derived from EVE_TAGS table.
function TagTreePicker({ selectedIds = [] }) {
  const parents = EVE_TAG_PARENTS.filter(p => p.id !== 't-type'); // type → primary, picked above
  return (
    <div style={{ marginTop: 12 }}>
      <Label>Other tags</Label>
      <div style={{
        marginTop: 8, padding: 16, borderRadius: 12,
        border: '1px solid rgba(31,26,20,0.08)', background: '#FBF6EE',
      }}>
        {parents.map((parent, idx) => {
          const children = EVE_TAG_CHILDREN(parent.id);
          if (children.length === 0) return null;
          return (
            <div key={parent.id} style={{ marginTop: idx > 0 ? 16 : 0 }}>
              <div style={{ fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700, color: '#8C7E6C', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{parent.label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 16px' }}>
                {children.map((tag) => {
                  const isOn = selectedIds.includes(tag.id);
                  return (
                    <div key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1F1A14' }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: 3,
                        background: isOn ? '#1F1A14' : '#fff',
                        border: '1px solid rgba(31,26,20,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {isOn && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-5" stroke="#FBF6EE" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div style={{ fontFamily: EVE.fonts.ui }}>{tag.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(31,26,20,0.08)', fontFamily: EVE.fonts.ui, fontSize: 11, color: '#8C7E6C', fontStyle: 'italic' }}>
          Don't see a tag you need? Add it at <span style={{ textDecoration: 'underline' }}>/admin/tags</span>. The app picks it up automatically.
        </div>
      </div>
    </div>
  );
}

function PhotoUploadField({ place }) {
  const primary = EVE_PRIMARY_TAG_FOR(place);
  const fallback = primary && primary.fallbackImage;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <Label>Upload</Label>
        <div style={{
          marginTop: 8, height: 200, borderRadius: 12,
          border: '1.5px dashed rgba(31,26,20,0.25)', background: '#FBF6EE',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 999, background: '#1F1A14',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 2v10M2 7h10" stroke="#FBF6EE" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </div>
          <div style={{ fontFamily: EVE.fonts.ui, fontSize: 13, fontWeight: 600 }}>Drop a photo or click to upload</div>
          <div style={{ fontFamily: EVE.fonts.body, fontSize: 11, color: '#8C7E6C', fontStyle: 'italic' }}>JPG/PNG, up to 8MB</div>
        </div>
        <Field label="Photo credit" value="" placeholder="Submitted by @username" compact/>
      </div>
      <div>
        <Label>Until you upload, this shows</Label>
        <div style={{
          marginTop: 8, height: 200, borderRadius: 12, position: 'relative', overflow: 'hidden',
          background: fallback ? `url(${fallback}) center/cover` : (primary && primary.tint) || '#3D2818',
        }}>
          <div style={{
            position: 'absolute', left: 10, bottom: 10,
            padding: '4px 9px', borderRadius: 999,
            background: 'rgba(0,0,0,0.5)', color: '#fff',
            fontFamily: EVE.fonts.ui, fontSize: 10, fontWeight: 600,
          }}>※ {primary ? primary.label.toLowerCase() : 'no primary tag'} · fallback</div>
        </div>
        <div style={{ marginTop: 8, fontFamily: EVE.fonts.ui, fontSize: 11, color: '#8C7E6C', fontStyle: 'italic', lineHeight: 1.5 }}>
          The fallback image comes from this place's <strong>primary tag</strong>. Change the primary tag to use a different stand-in.
        </div>
      </div>
    </div>
  );
}

// ─── 3. TAGS ──────────────────────────────────────────────────────────────
// Parent/child tree. Each tag has: display name, internal value, sort order,
// optional parent. Primary-eligible tags additionally get: isPrimary toggle,
// fallback-image upload, tint/accent color tokens.

function AdminTagsTree() {
  const parents = EVE_TAG_PARENTS;
  const standalone = EVE_TAGS.filter(t => t.parent === null && false); // none in current data
  return (
    <AdminFrame active="tags">
      <div style={{ padding: '36px 48px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div style={{ fontFamily: EVE.fonts.display, fontStyle: 'italic', fontSize: 44, lineHeight: 1.0, letterSpacing: '-0.02em' }}>Tags</div>
            <div style={{ marginTop: 8, fontFamily: EVE.fonts.body, fontSize: 14, color: '#54483A', maxWidth: 620, lineHeight: 1.5 }}>
              The tag tree is the only taxonomy. Filter chips, place pips, primary categories — all derived from this. Drag to reorder. Toggle primary on a tag to make it eligible as a place's headline.
            </div>
          </div>
          <PrimaryBtn>+ New tag</PrimaryBtn>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 20, fontFamily: EVE.fonts.ui, fontSize: 12, color: '#54483A', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 999, background: '#E07B3F' }}/>Primary-eligible
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(31,26,20,0.18)' }}/>Standard tag
          </div>
        </div>

        {/* Tree */}
        <div style={{ flex: 1, overflow: 'auto', borderRadius: 14, border: '1px solid rgba(31,26,20,0.08)', background: '#FFF' }}>
          {parents.map((parent) => {
            const children = EVE_TAG_CHILDREN(parent.id);
            return (
              <TagTreeGroup key={parent.id} parent={parent} children={children}/>
            );
          })}
        </div>
      </div>
    </AdminFrame>
  );
}

function TagTreeGroup({ parent, children }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(31,26,20,0.06)' }}>
      <div style={{
        padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 10,
        background: '#FBF6EE',
      }}>
        <div style={{ fontFamily: EVE.fonts.ui, fontSize: 11, color: '#8C7E6C', fontWeight: 700, letterSpacing: '0.1em' }}>≡</div>
        <div style={{ fontFamily: EVE.fonts.display, fontStyle: 'italic', fontSize: 22, color: '#1F1A14' }}>{parent.label}</div>
        <div style={{ fontFamily: EVE.fonts.ui, fontSize: 11, color: '#8C7E6C', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{children.length} tags</div>
        <div style={{ flex: 1 }}/>
        <SmallBtn tone="ghost">Edit group</SmallBtn>
      </div>
      <div>
        {children.map((tag) => <TagTreeRow key={tag.id} tag={tag}/>)}
      </div>
    </div>
  );
}

function TagTreeRow({ tag }) {
  return (
    <div style={{
      padding: '12px 24px 12px 56px',
      display: 'grid', gridTemplateColumns: '20px 1fr 220px 1fr 180px',
      gap: 16, alignItems: 'center',
      borderTop: '1px solid rgba(31,26,20,0.04)',
    }}>
      <div style={{ color: '#8C7E6C', fontFamily: EVE.fonts.ui, fontSize: 11, cursor: 'grab' }}>≡</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {tag.isPrimary && <div title="Primary-eligible" style={{ width: 8, height: 8, borderRadius: 999, background: '#E07B3F' }}/>}
        <div style={{ fontFamily: EVE.fonts.body, fontSize: 15, color: '#1F1A14' }}>{tag.label}</div>
        <div style={{ fontFamily: 'ui-monospace, SF Mono, Menlo, monospace', fontSize: 11, color: '#8C7E6C', background: '#FBF6EE', padding: '2px 7px', borderRadius: 4 }}>{tag.value}</div>
      </div>
      {/* Primary toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Toggle on={!!tag.isPrimary}/>
        <div style={{ fontFamily: EVE.fonts.ui, fontSize: 12, color: '#54483A' }}>Primary</div>
      </div>
      {/* Fallback image (only for primary) */}
      <div>
        {tag.isPrimary ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 56, height: 36, borderRadius: 6, flexShrink: 0,
              background: tag.fallbackImage ? `url(${tag.fallbackImage}) center/cover` : tag.tint || '#3D2818',
              border: '1px solid rgba(31,26,20,0.08)',
            }}/>
            <div style={{ fontFamily: EVE.fonts.ui, fontSize: 11, color: '#8C7E6C' }}>
              {tag.fallbackImage ? <span style={{ color: '#2D6A47', fontWeight: 600 }}>Fallback set</span> : <span style={{ color: '#A8341A', fontWeight: 600 }}>Upload fallback →</span>}
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: EVE.fonts.ui, fontSize: 11, color: '#A09382', fontStyle: 'italic' }}>—</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <SmallBtn tone="primary">Edit</SmallBtn>
        <SmallBtn tone="ghost">⋯</SmallBtn>
      </div>
    </div>
  );
}

function Toggle({ on }) {
  return (
    <div style={{
      width: 32, height: 18, borderRadius: 999,
      background: on ? '#1F1A14' : 'rgba(31,26,20,0.18)',
      position: 'relative', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 16 : 2,
        width: 14, height: 14, borderRadius: 999, background: '#FBF6EE',
      }}/>
    </div>
  );
}

// ─── Form primitives ──────────────────────────────────────────────────────

function FormSection({ title, subtitle, accent, children }) {
  return (
    <div style={{
      marginBottom: 22, padding: 24, borderRadius: 14,
      background: accent ? 'rgba(224,123,63,0.06)' : '#FFF',
      border: accent ? '1px solid rgba(224,123,63,0.20)' : '1px solid rgba(31,26,20,0.08)',
    }}>
      <div style={{
        fontFamily: EVE.fonts.display, fontStyle: 'italic',
        fontSize: 24, lineHeight: 1.0, color: '#1F1A14', letterSpacing: '-0.01em',
      }}>{title}</div>
      {subtitle && <div style={{ marginTop: 6, fontFamily: EVE.fonts.body, fontSize: 13, color: '#54483A', maxWidth: 540, lineHeight: 1.5 }}>{subtitle}</div>}
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  );
}

function FormRow({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{children}</div>;
}

function Label({ children, required }) {
  return (
    <div style={{
      fontFamily: EVE.fonts.ui, fontSize: 11, fontWeight: 700,
      color: '#54483A', letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>{children}{required && <span style={{ color: '#E07B3F', marginLeft: 4 }}>*</span>}</div>
  );
}

function Field({ label, value, placeholder, multiline, hint, example, limit, required, compact }) {
  const isEmpty = !value;
  return (
    <div>
      <Label required={required}>{label}</Label>
      <div style={{
        marginTop: 6, padding: multiline ? '12px 14px' : '10px 14px',
        borderRadius: 10, background: '#FBF6EE',
        border: '1px solid rgba(31,26,20,0.10)',
        minHeight: multiline ? 72 : 'auto',
        fontFamily: EVE.fonts.body, fontSize: 14, lineHeight: 1.5,
        color: isEmpty ? '#A09382' : '#1F1A14',
      }}>{value || placeholder}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, gap: 10 }}>
        {hint && <div style={{ fontFamily: EVE.fonts.ui, fontSize: 11, color: '#8C7E6C', fontStyle: 'italic', flex: 1 }}>{hint}</div>}
        {limit && <div style={{ fontFamily: EVE.fonts.ui, fontSize: 11, color: '#8C7E6C', fontVariantNumeric: 'tabular-nums' }}>{(value || '').length} / {limit}</div>}
      </div>
      {example && (
        <div style={{ marginTop: 8, padding: '8px 12px', borderLeft: '2px solid #E07B3F', background: 'rgba(224,123,63,0.04)', fontFamily: EVE.fonts.body, fontSize: 12, fontStyle: 'italic', color: '#54483A', lineHeight: 1.5 }}>
          <strong style={{ color: '#B85420', fontStyle: 'normal', fontFamily: EVE.fonts.ui, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>What good looks like</strong>
          "{example}"
        </div>
      )}
    </div>
  );
}

function FieldSelect({ label, value, hint, required }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      <div style={{
        marginTop: 6, padding: '10px 14px', borderRadius: 10,
        background: '#FFF', border: '1px solid rgba(31,26,20,0.18)',
        fontFamily: EVE.fonts.body, fontSize: 14, color: '#1F1A14',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>{value} <span style={{ color: '#8C7E6C' }}>▾</span></div>
      {hint && <div style={{ marginTop: 6, fontFamily: EVE.fonts.ui, fontSize: 11, color: '#8C7E6C', fontStyle: 'italic' }}>{hint}</div>}
    </div>
  );
}

function SearchInput({ placeholder }) {
  return (
    <div style={{
      width: 260, height: 36, padding: '0 12px',
      borderRadius: 999, background: '#FFF',
      border: '1px solid rgba(31,26,20,0.12)',
      display: 'flex', alignItems: 'center', gap: 8,
      fontFamily: EVE.fonts.ui, fontSize: 13, color: '#8C7E6C',
    }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 8l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      {placeholder}
    </div>
  );
}

function FilterPill({ active, count, tone = 'neutral', children }) {
  const colors = {
    neutral: { bg: '#FFF', fg: '#1F1A14', count: '#8C7E6C', border: 'rgba(31,26,20,0.12)' },
    warning: { bg: '#FFF', fg: '#54483A', count: '#B85420', border: 'rgba(184,84,32,0.20)' },
    alert:   { bg: '#FFF', fg: '#54483A', count: '#A8341A', border: 'rgba(168,52,26,0.30)' },
    success: { bg: '#FFF', fg: '#54483A', count: '#2D6A47', border: 'rgba(45,106,71,0.20)' },
  };
  const c = active ? { bg: '#1F1A14', fg: '#FBF6EE', count: 'rgba(251,246,238,0.7)', border: '#1F1A14' } : (colors[tone] || colors.neutral);
  return (
    <div style={{
      padding: '6px 12px', borderRadius: 999,
      background: c.bg, color: c.fg,
      border: `1px solid ${c.border}`,
      fontFamily: EVE.fonts.ui, fontSize: 12, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>{children}<span style={{ color: c.count, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{count}</span></div>
  );
}

function PrimaryBtn({ children }) {
  return (
    <div style={{
      padding: '8px 18px', borderRadius: 999,
      background: '#1F1A14', color: '#FBF6EE',
      fontFamily: EVE.fonts.ui, fontSize: 13, fontWeight: 600,
      letterSpacing: '0.01em', display: 'inline-flex', alignItems: 'center',
    }}>{children}</div>
  );
}

function SecondaryBtn({ children, tone = 'neutral' }) {
  const colors = tone === 'danger'
    ? { fg: '#A8341A', border: 'rgba(168,52,26,0.30)' }
    : { fg: '#1F1A14', border: 'rgba(31,26,20,0.20)' };
  return (
    <div style={{
      padding: '8px 18px', borderRadius: 999,
      background: 'transparent', color: colors.fg,
      border: `1px solid ${colors.border}`,
      fontFamily: EVE.fonts.ui, fontSize: 13, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center',
    }}>{children}</div>
  );
}

function SmallBtn({ children, tone = 'primary' }) {
  const colors = {
    primary: { bg: '#1F1A14', fg: '#FBF6EE' },
    ghost:   { bg: 'transparent', fg: '#54483A', border: '1px solid rgba(31,26,20,0.15)' },
  };
  const c = colors[tone];
  return (
    <div style={{
      padding: '5px 12px', borderRadius: 6,
      background: c.bg, color: c.fg,
      border: c.border || 'none',
      fontFamily: EVE.fonts.ui, fontSize: 12, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>{children}</div>
  );
}

Object.assign(window, {
  AdminPlacesList, AdminEditPlace, AdminTagsTree,
});
