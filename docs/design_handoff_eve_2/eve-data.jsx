// EVE v3 — Tag-driven data model.
//
// PRINCIPLE: The data model IS the design system. No client-side groupings,
// no hardcoded categories, no vibes that aren't editable from the admin.
//
// Tags are the only taxonomy. Every tag has:
//   - id, value (slug), label (display name), sortOrder, parent (id|null)
//   - isPrimary (bool): can this tag be a place's "primary" tag?
//   - fallbackImage (uploaded URL): shown when a place with this primary tag has no photo
//   - tint, accent (color tokens, set by admin per primary tag, optional)
//
// Each place has:
//   - identity: name, address, phone, website
//   - taxonomy: primaryTagId (FK to a tag where isPrimary=true), tagIds[] (other tags)
//   - editorial (all OPTIONAL — graceful fallback when missing):
//       pitch, perfectWhen, insiderTip, vibe, crowd, specials, photoUrl, photoCredit
//
// Filters/pips on the client come from the tag tree. Parent tags = sections,
// children = chips. If admin retires a tag, it disappears from the app.

// ─── TAG TABLE ────────────────────────────────────────────────────────────
// Mirrors the structure of the admin /admin/tags table. Parent tags act as
// section headers in the filter sheet. isPrimary tags are eligible to be a
// place's headline tag (drives row meta, fallback image).

window.EVE_TAGS = [
  // Parent tags (sections in filter sheet)
  { id: 't-when',  value: 'when',  label: 'When',  parent: null, sortOrder: 1 },
  { id: 't-vibe',  value: 'vibe',  label: 'Vibe',  parent: null, sortOrder: 2 },
  { id: 't-type',  value: 'type',  label: 'Type',  parent: null, sortOrder: 3 },
  { id: 't-area',  value: 'area',  label: 'Outside East Village', parent: null, sortOrder: 4 },

  // Type tags — these are the primary-eligible ones (each can be a place's headline)
  { id: 't-dive',     value: 'dive',     label: 'Dive bar',     parent: 't-type', sortOrder: 1,
    isPrimary: true, fallbackImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=80&auto=format&fit=crop',
    tint: '#7A3B1F', accent: '#F4A05A' },
  { id: 't-pub',      value: 'pub',      label: 'Pub',          parent: 't-type', sortOrder: 2,
    isPrimary: true, fallbackImage: 'https://images.unsplash.com/photo-1571767454098-246b94fbcf70?w=1200&q=80&auto=format&fit=crop',
    tint: '#3D2818', accent: '#D4A574' },
  { id: 't-cocktail', value: 'cocktail', label: 'Cocktail bar', parent: 't-type', sortOrder: 3,
    isPrimary: true, fallbackImage: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&q=80&auto=format&fit=crop',
    tint: '#2B1B2F', accent: '#E8B4D0' },
  { id: 't-coffee',   value: 'coffee',   label: 'Coffee',       parent: 't-type', sortOrder: 4,
    isPrimary: true, fallbackImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80&auto=format&fit=crop',
    tint: '#3A2818', accent: '#C89F6F' },
  { id: 't-diner',    value: 'diner',    label: 'Diner',        parent: 't-type', sortOrder: 5,
    isPrimary: true, fallbackImage: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80&auto=format&fit=crop',
    tint: '#7A2118', accent: '#F2C078' },
  { id: 't-livemusic',value: 'live-music', label: 'Live music', parent: 't-type', sortOrder: 6,
    isPrimary: true, fallbackImage: 'https://images.unsplash.com/photo-1538488881038-e252a119ace7?w=1200&q=80&auto=format&fit=crop',
    tint: '#1A1A1F', accent: '#F09060' },
  { id: 't-pizza',    value: 'pizza',    label: 'Pizza',        parent: 't-type', sortOrder: 7,
    isPrimary: true, fallbackImage: null, tint: '#6B2A1B', accent: '#F0A878' },

  // When tags
  { id: 't-mon', value: 'monday',    label: 'Monday',    parent: 't-when', sortOrder: 1 },
  { id: 't-tue', value: 'tuesday',   label: 'Tuesday',   parent: 't-when', sortOrder: 2 },
  { id: 't-wed', value: 'wednesday', label: 'Wednesday', parent: 't-when', sortOrder: 3 },
  { id: 't-thu', value: 'thursday',  label: 'Thursday',  parent: 't-when', sortOrder: 4 },
  { id: 't-fri', value: 'friday',    label: 'Friday',    parent: 't-when', sortOrder: 5 },
  { id: 't-sat', value: 'saturday',  label: 'Saturday',  parent: 't-when', sortOrder: 6 },
  { id: 't-sun', value: 'sunday',    label: 'Sunday',    parent: 't-when', sortOrder: 7 },
  { id: 't-hh',     value: 'happy-hour',         label: 'Happy Hours',         parent: 't-when', sortOrder: 8 },
  { id: 't-hh8',    value: 'till-8pm-happy',     label: 'Till 8PM Happy Hours', parent: 't-when', sortOrder: 9 },
  { id: 't-hhwknd', value: 'weekend-happy',      label: 'Weekend Happy Hours', parent: 't-when', sortOrder: 10 },
  { id: 't-late',   value: 'late-night-eats',    label: 'Late Night Eats',     parent: 't-when', sortOrder: 11 },
  { id: 't-brunch', value: 'brunch',             label: 'Brunch',              parent: 't-when', sortOrder: 12 },
  { id: 't-brunchb',value: 'brunch-boozy',       label: 'Brunch Boozy',        parent: 't-when', sortOrder: 13 },

  // Vibe tags
  { id: 't-food',   value: 'food',         label: 'Food',         parent: 't-vibe', sortOrder: 1 },
  { id: 't-dj',     value: 'dj',           label: 'DJ',           parent: 't-vibe', sortOrder: 2 },
  { id: 't-buck',   value: 'buck-hunter',  label: 'Buck Hunter',  parent: 't-vibe', sortOrder: 3 },
  { id: 't-darts',  value: 'darts',        label: 'Darts',        parent: 't-vibe', sortOrder: 4 },
  { id: 't-pool',   value: 'pool',         label: 'Pool Tables',  parent: 't-vibe', sortOrder: 5 },
  { id: 't-skee',   value: 'skee-ball',    label: 'Skeeball',     parent: 't-vibe', sortOrder: 6 },
  { id: 't-trivia', value: 'trivia',       label: 'Trivia Night', parent: 't-vibe', sortOrder: 7 },
  { id: 't-livem',  value: 'live-music-tag', label: 'Live Music', parent: 't-vibe', sortOrder: 8 },
  { id: 't-foos',   value: 'foosball',     label: 'Foos Ball',    parent: 't-vibe', sortOrder: 9 },
  { id: 't-house',  value: 'house-music',  label: 'House music',  parent: 't-vibe', sortOrder: 10 },
  { id: 't-sports', value: 'sports-bars',  label: 'Sports Bars',  parent: 't-vibe', sortOrder: 11 },
  { id: 't-karaoke',value: 'karaoke',      label: 'Karaoke',      parent: 't-vibe', sortOrder: 12 },
  { id: 't-byob',   value: 'byob',         label: 'BYOB',         parent: 't-vibe', sortOrder: 13 },
  { id: 't-wine',   value: 'wine-bar',     label: 'Wine Bar',     parent: 't-vibe', sortOrder: 14 },
  { id: 't-ping',   value: 'ping-pong',    label: 'Ping pong',    parent: 't-vibe', sortOrder: 15 },
  { id: 't-dance',  value: 'dancing',      label: 'Dancing',      parent: 't-vibe', sortOrder: 16 },
  { id: 't-out',    value: 'outdoor-seating',    label: 'Outdoor Seating',    parent: 't-vibe', sortOrder: 17 },
  { id: 't-outsun', value: 'late-sun-outdoor',   label: 'Late Sun Outdoor Seating', parent: 't-vibe', sortOrder: 18 },

  // Outside East Village
  { id: 't-wv',     value: 'west-village',       label: 'West Village',       parent: 't-area', sortOrder: 1 },
];

// helpers
window.EVE_TAG_BY_ID = Object.fromEntries(EVE_TAGS.map(t => [t.id, t]));
window.EVE_PRIMARY_TAGS = EVE_TAGS.filter(t => t.isPrimary);
window.EVE_TAG_CHILDREN = (parentId) => EVE_TAGS.filter(t => t.parent === parentId)
  .sort((a,b) => (a.sortOrder||0) - (b.sortOrder||0));
window.EVE_TAG_PARENTS = EVE_TAGS.filter(t => t.parent === null)
  .sort((a,b) => (a.sortOrder||0) - (b.sortOrder||0));

// ─── PLACES ───────────────────────────────────────────────────────────────
// Editorial fields are ALL optional. The mobile UI must degrade gracefully
// when any of them are missing. Real production data starts mostly empty
// and gets filled in over time via the admin.

window.EVE_PLACES = [
  // Fully-editorial place — all fields written
  {
    id: 1, name: "Sophie's",
    address: '507 E 5th St', cross: 'btwn Aves A & B',
    phone: '(212) 228-5680', website: 'http://sophiesbar.com/',
    primaryTagId: 't-dive',
    tagIds: ['t-tue','t-hh','t-late','t-pool'],
    pitch: "The jukebox is the whole personality. Go on a Tuesday — it gets weird in the best way, and your $4 PBR will somehow taste like the meaning of life.",
    perfectWhen: "you want to talk for hours and not look at a menu",
    insiderTip: "Order the well whiskey, sit in the back booth, don't bother with the bathroom situation.",
    vibe: 'Loud · Cash only · No frills',
    crowd: 'Locals, NYU grads who never left',
    specials: '$4 PBRs all day Tuesday',
    photoUrl: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1200&q=80&auto=format&fit=crop',
    photoCredit: 'Submitted by @ev_regular',
    hours: 'Open till 4am', open: true,
  },
  // Editorial complete, no photo — typographic fallback uses primary tag image
  {
    id: 2, name: "Mona's",
    address: '224 Avenue B', cross: 'at E 14th',
    phone: '(212) 353-3780', website: null,
    primaryTagId: 't-pub',
    tagIds: ['t-mon','t-livem','t-late'],
    pitch: "Monday night trad session at 11 sharp. The fiddler is your new favorite person and the pint is poured like it matters — because it does.",
    perfectWhen: "you want a Monday that doesn't feel like a Monday",
    insiderTip: "Don't talk during a tune. Tip the bartender in cash, even if you tab.",
    vibe: 'Live music · Warm · No phones',
    crowd: 'Musicians, regulars, the occasional wandering poet',
    photoUrl: null, photoCredit: null,
    hours: 'Open till 4am', open: true,
  },
  // Editorial complete, with photo
  {
    id: 3, name: 'Abraço',
    address: '81 E 7th St', cross: 'btwn 1st & 2nd',
    phone: '(212) 388-9731', website: 'http://abraconyc.com/',
    primaryTagId: 't-coffee',
    tagIds: ['t-brunch'],
    pitch: "Twelve square feet of perfect espresso and the best olive-oil cake in the city. You'll stand on the sidewalk to eat it. You won't mind.",
    perfectWhen: "you have 20 minutes and want to feel like a real New Yorker",
    insiderTip: "Cortado + olive-oil cake. Get there before 10 or after 2.",
    vibe: 'Tiny · Standing · Olive-oil cake',
    crowd: 'Industry kids, freelancers, your most stylish friend',
    photoUrl: null, photoCredit: null,
    hours: 'Open till 6pm', open: true,
  },
  // Editorial complete
  {
    id: 4, name: 'Veselka',
    address: '144 Second Ave', cross: 'at E 9th',
    phone: '(212) 228-9682', website: 'http://veselka.com/',
    primaryTagId: 't-diner',
    tagIds: ['t-late','t-brunch','t-food'],
    pitch: "Open since 1954, open right now, open at 3am when you really need it. The pierogi are the answer no matter what the question was.",
    perfectWhen: "you ended up here at 3am and you're not mad about it",
    insiderTip: "Cheese pierogi fried, side of borscht, black coffee. Trust me.",
    vibe: 'Pierogi · Borscht · Booths',
    crowd: 'Everyone, eventually',
    photoUrl: 'https://images.unsplash.com/photo-1555992336-fb0d29498b13?w=1200&q=80&auto=format&fit=crop',
    photoCredit: 'Submitted by @borschtbeliever',
    hours: 'Open 24 hours', open: true,
  },
  // ─── REAL-WORLD UNFILLED PLACES — only identity + tags, no editorial ───
  // These are what the actual database mostly looks like today. The mobile
  // UI must still feel intentional with rows like these.
  {
    id: 5, name: '11th Street Bar',
    address: '510 E 11th St', cross: null,
    phone: '(212) 982-3929', website: 'http://www.11thstbar.com/',
    primaryTagId: 't-livemusic',
    tagIds: ['t-livem'],
    pitch: null, perfectWhen: null, insiderTip: null,
    vibe: null, crowd: null, specials: 'No Happy hour',
    photoUrl: null, photoCredit: null,
    hours: null, open: true,
  },
  {
    id: 6, name: '12th St. Ale House',
    address: '192 2nd Ave', cross: null,
    phone: null, website: 'http://12thstreetalehouse.com/',
    primaryTagId: 't-pub',
    tagIds: [],
    pitch: null, perfectWhen: null, insiderTip: null,
    vibe: null, crowd: null,
    photoUrl: null, photoCredit: null,
    hours: null, open: true,
  },
  {
    id: 7, name: '13th Step',
    address: '149 2nd Ave', cross: null,
    phone: null, website: null,
    primaryTagId: 't-pub',
    tagIds: ['t-sports'],
    pitch: null, perfectWhen: null, insiderTip: null,
    vibe: null, crowd: null,
    photoUrl: null, photoCredit: null,
    hours: null, open: true,
  },
  {
    id: 8, name: '2A',
    address: '25 Avenue A', cross: 'at E 2nd',
    phone: null, website: 'http://www.2anyc.com/',
    primaryTagId: 't-dive',
    tagIds: [],
    pitch: null, perfectWhen: null, insiderTip: null,
    vibe: null, crowd: null,
    photoUrl: null, photoCredit: null,
    hours: null, open: true,
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────

// Get the primary tag object for a place. Returns null if missing/invalid.
window.EVE_PRIMARY_TAG_FOR = (place) => {
  if (!place || !place.primaryTagId) return null;
  return EVE_TAG_BY_ID[place.primaryTagId] || null;
};

// Get all the place's tag objects (excluding primary), sorted by parent then sortOrder.
window.EVE_TAGS_FOR = (place) => {
  if (!place || !place.tagIds) return [];
  return place.tagIds
    .map(id => EVE_TAG_BY_ID[id])
    .filter(Boolean)
    .sort((a,b) => (a.sortOrder||0) - (b.sortOrder||0));
};

// Editorial completeness — used by admin Places list to show what's missing.
window.EVE_COMPLETENESS = (place) => {
  const fields = ['pitch','perfectWhen','insiderTip','vibe','crowd','photoUrl'];
  const filled = fields.filter(f => place[f] && String(place[f]).trim().length > 0);
  return { filled: filled.length, total: fields.length, fields, filledFields: filled };
};

// Friend-voice rotating openers
window.EVE_OPENERS = [
  "Tonight, you want something",
  "It's Tuesday. Make it count",
  "Hi. Where are we going",
  "Pick a feeling, we'll find the place",
];
