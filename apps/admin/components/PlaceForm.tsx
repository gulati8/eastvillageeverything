'use client';

import { useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { TagPicker } from './TagPicker';
import { NeighborhoodPicker } from './NeighborhoodPicker';
import { ReturnTo } from './ReturnTo';
import { SubmitButton } from './SubmitButton';
import { CollapsibleSection } from './CollapsibleSection';
import { useNotices } from './Notices';
import { EDITORIAL_FIELDS, type EditorialField, type EditorialFields } from '../lib/editorial';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Text fields the generate route reads from the page's unsaved state. */
const GENERATE_FORM_KEYS = ['name', 'address', 'cross_street', 'url', 'specials', 'notes', ...EDITORIAL_FIELDS] as const;

const EDITORIAL_LABELS: Record<EditorialField, string> = {
  pitch: 'Pitch',
  perfect: 'Perfect when…',
  insider: 'Insider tip',
  vibe: 'Vibe',
  crowd: 'Crowd',
};

interface Tag { id: string; value: string; display: string; }
interface Neighborhood { id: string; value: string; display: string; }

interface Props {
  action: (formData: FormData) => void;
  /** Set on the edit page. Without it (a new place) Generate is unavailable: the route needs a saved row. */
  placeId?: string;
  defaultValues?: Partial<{
    name: string; address: string; cross_street: string; phone: string; url: string;
    /** Mirrored first photo; the readiness row reads it. Photos themselves live in `PlacePhotos`. */
    neighborhood_id: string; photo_url: string;
    specials: string; notes: string;
    pitch: string; perfect: string; insider: string; vibe: string; crowd: string;
  }>;
  allTags: Tag[];
  selectedTags: Tag[];
  neighborhoods: Neighborhood[];
  showEditorial?: boolean;
}

type EditorialState = Record<EditorialField, string>;

type GenerateOutcome =
  | { ok: true; fields: EditorialFields; warnings: string[] }
  | { ok: false; kind: 'signed-out' }
  | { ok: false; kind: 'server'; message: string }
  | { ok: false; kind: 'network' };

/**
 * Posts to the generate route with the page's unsaved text. Nothing is
 * written server-side; the caller decides what to keep and Save persists it.
 */
async function postGenerate(placeId: string, fields: EditorialField[], form: HTMLFormElement): Promise<GenerateOutcome> {
  const data = new FormData(form);
  const snapshot: Record<string, string> = {};
  for (const key of GENERATE_FORM_KEYS) {
    const value = data.get(key);
    if (typeof value === 'string') snapshot[key] = value;
  }
  let res: Response;
  try {
    res = await fetch(`${basePath}/api/admin/generate`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place_id: placeId, fields, form: snapshot }),
    });
  } catch {
    return { ok: false, kind: 'network' };
  }
  if (res.status === 401) return { ok: false, kind: 'signed-out' };
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    return { ok: false, kind: 'network' };
  }
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  if (res.ok) {
    const returned = record?.fields;
    if (!returned || typeof returned !== 'object') return { ok: false, kind: 'network' };
    const out = {} as EditorialFields;
    for (const key of EDITORIAL_FIELDS) {
      const value = (returned as Record<string, unknown>)[key];
      out[key] = typeof value === 'string' ? value : null;
    }
    const warnings = Array.isArray(record?.warnings) ? record.warnings.filter((w): w is string => typeof w === 'string') : [];
    return { ok: true, fields: out, warnings };
  }
  const message = typeof record?.error === 'string' ? record.error : null;
  if (message) return { ok: false, kind: 'server', message };
  return { ok: false, kind: 'network' };
}

export function PlaceForm({ action, placeId, defaultValues = {}, allTags, selectedTags, neighborhoods }: Props) {
  const v = defaultValues;
  const defaultNeighborhood =
    v.neighborhood_id ||
    neighborhoods.find((n) => n.value === 'east-village')?.id ||
    neighborhoods[0]?.id ||
    '';
  const hasName = Boolean(v.name?.trim());
  const hasAddress = Boolean(v.address?.trim());
  const hasContact = Boolean(v.phone?.trim() || v.url?.trim());
  const hasPhoto = Boolean(v.photo_url?.trim());
  const hasTags = selectedTags.length > 0;

  const formRef = useRef<HTMLFormElement>(null);
  const { notify } = useNotices();
  const pathname = usePathname();
  const [editorial, setEditorial] = useState<EditorialState>({
    pitch: v.pitch ?? '',
    perfect: v.perfect ?? '',
    insider: v.insider ?? '',
    vibe: v.vibe ?? '',
    crowd: v.crowd ?? '',
  });
  /** The fields a request is writing right now; null when idle. */
  const [writing, setWriting] = useState<EditorialField[] | null>(null);
  const generating = writing !== null;

  const hasEditorial = EDITORIAL_FIELDS.some((f) => editorial[f].trim());
  const setField = (field: EditorialField, value: string) => setEditorial((s) => ({ ...s, [field]: value }));

  const generate = async (fields: EditorialField[]) => {
    if (!placeId || generating || !formRef.current) return;
    setWriting(fields);
    try {
      const result = await postGenerate(placeId, fields, formRef.current);
      if (!result.ok) {
        if (result.kind === 'signed-out') {
          notify({
            kind: 'error',
            title: 'You were signed out. Sign in again.',
            action: { label: 'Sign in', href: `/login?next=${encodeURIComponent(pathname)}` },
          });
        } else if (result.kind === 'server') {
          notify({ kind: 'error', title: result.message });
        } else {
          notify({ kind: 'error', title: 'Connection dropped. Try again.' });
        }
        return;
      }
      const filled = fields.filter((f) => result.fields[f] !== null);
      const empty = fields.filter((f) => result.fields[f] === null);
      if (filled.length > 0) {
        setEditorial((s) => {
          const next = { ...s };
          for (const f of filled) next[f] = result.fields[f] ?? '';
          return next;
        });
        notify({ kind: 'success', title: 'Editorial drafted', detail: `${filled.length} field(s) filled. Review, then Save.` });
      }
      if (empty.length > 0) {
        notify({ kind: 'info', title: `Nothing found for ${empty.map((f) => EDITORIAL_LABELS[f]).join(', ')}.` });
      }
      if (result.warnings.length > 0) {
        notify({ kind: 'info', title: 'Check the wording', detail: result.warnings[0] });
      }
    } finally {
      setWriting(null);
    }
  };

  const onGenerateBlank = () => {
    const blank = EDITORIAL_FIELDS.filter((f) => !editorial[f].trim());
    if (blank.length === 0) {
      notify({ kind: 'info', title: 'Nothing to fill. Every editorial field has text; use Redo on one to rewrite it.' });
      return;
    }
    void generate(blank);
  };

  const editorialField = (field: EditorialField, hint: string, rows?: number) => (
    <EditorialInput
      key={field}
      field={field}
      label={EDITORIAL_LABELS[field]}
      value={editorial[field]}
      onChange={(value) => setField(field, value)}
      hint={hint}
      rows={rows}
      busy={writing?.includes(field) ?? false}
      redo={placeId ? { onClick: () => void generate([field]), disabled: generating } : null}
    />
  );

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <ReturnTo />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="space-y-5">
          <CollapsibleSection
            title="Basics"
            description="Required data stays compatible with the old web directory and the mobile app."
            defaultOpen
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Name" name="name" defaultValue={v.name ?? ''} required />
              <NeighborhoodPicker name="neighborhood_id" options={neighborhoods} initialId={defaultNeighborhood} />
              <Field label="Address" name="address" defaultValue={v.address ?? ''} />
              <Field label="Cross street" name="cross_street" defaultValue={v.cross_street ?? ''} />
              <Field label="Phone" name="phone" defaultValue={v.phone ?? ''} />
              <Field label="Website" name="url" defaultValue={v.url ?? ''} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Tags in mobile order"
            description="The first tag is the headline category the mobile experience uses most prominently."
          >
            <TagPicker name="tag_ids" allTags={allTags} initial={selectedTags} />
          </CollapsibleSection>

          <CollapsibleSection
            title="Current web fields"
            description="These continue to feed the existing eastvillageeverything.nyc web experience."
          >
            <div className="space-y-3">
              <TextArea label="Specials" name="specials" defaultValue={v.specials ?? ''} rows={3} />
              <TextArea label="Notes" name="notes" defaultValue={v.notes ?? ''} rows={3} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Editorial for mobile"
            description="Optional enriched copy. The app and old web must still work when these are blank."
          >
            <div className="space-y-3">
              {placeId ? (
                <div>
                  <button
                    type="button"
                    onClick={onGenerateBlank}
                    disabled={generating}
                    aria-busy={generating || undefined}
                    className="ui w-full rounded-input bg-ink px-4 py-3 text-sm uppercase text-paper hover:opacity-90 disabled:cursor-progress disabled:opacity-70"
                  >
                    {generating ? 'Writing…' : 'Generate editorial'}
                  </button>
                  <p className="ui mt-1 text-xs text-ink3">Fills the blank fields below. Nothing is saved until you press Save.</p>
                </div>
              ) : (
                <p className="text-sm text-ink2">Save the place first, then generate editorial here.</p>
              )}
              {editorialField('pitch', '2 sentences. Friend voice.', 2)}
              {editorialField('perfect', "finishes 'Perfect when…'")}
              {editorialField('insider', 'One sentence.', 2)}
              {editorialField('vibe', "3 words separated by ' · '")}
              {editorialField('crowd', "Who's there.")}
            </div>
          </CollapsibleSection>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-5">
          <CollapsibleSection title="Readiness">
            <div className="space-y-2">
              <ReadinessRow label="Old web safe" good={hasName} detail={hasName ? 'Name present' : 'Needs name'} />
              <ReadinessRow label="Mobile safe" good={hasName} detail={hasName ? 'Fallbacks available' : 'Needs name'} />
              <ReadinessRow label="Address" good={hasAddress} detail={hasAddress ? 'Good' : 'Optional but useful'} optional />
              <ReadinessRow label="Contact" good={hasContact} detail={hasContact ? 'Phone or web' : 'Optional'} optional />
              <ReadinessRow label="Photo" good={hasPhoto} detail={hasPhoto ? 'Uploaded' : 'Fallback art used'} optional />
              <ReadinessRow label="Tags ordered" good={hasTags} detail={hasTags ? `${selectedTags.length} selected` : 'Optional'} optional />
              <ReadinessRow label="Editorial" good={hasEditorial} detail={hasEditorial ? 'Draft present' : 'Optional'} optional />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Guardrails">
            <p className="text-sm text-ink2">
              New enriched fields are optional. Blank values must not break the public web directory or the mobile app.
            </p>
          </CollapsibleSection>
        </aside>
      </div>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-hairline bg-paper/95 px-4 py-3 md:static md:mx-0 md:bg-transparent md:px-0 md:pt-4">
        <SubmitButton pendingLabel="Saving…" busy={generating} className="ui text-sm uppercase bg-ink text-paper px-4 py-2 rounded-input disabled:opacity-80">
          Save
        </SubmitButton>
        <span className="ui text-xs uppercase text-ink3">Safe for old web and mobile fallbacks</span>
      </div>
    </form>
  );
}

function ReadinessRow({ label, good, detail, optional = false }: { label: string; good: boolean; detail: string; optional?: boolean }) {
  const state = good ? '✓' : optional ? '·' : '!';
  return (
    <div className="grid grid-cols-[1.5rem_1fr] gap-2 border-b border-hairline pb-2 last:border-b-0">
      <span className={`ui grid h-6 w-6 place-items-center rounded-full text-xs ${good ? 'bg-paper text-accent' : optional ? 'bg-paper text-ink3' : 'bg-paper text-red-700'}`}>
        {state}
      </span>
      <span>
        <span className="ui block text-xs uppercase text-ink">{label}</span>
        <span className="ui block text-[0.68rem] uppercase text-ink3">{detail}</span>
      </span>
    </div>
  );
}

const INPUT_CLASS = 'w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent';

function Field({ label, name, defaultValue, required, hint }: { label: string; name: string; defaultValue: string; required?: boolean; hint?: string }) {
  return (
    <label className="block">
      <span className="ui text-xs uppercase text-ink3">{label}</span>
      <input name={name} defaultValue={defaultValue} required={required} className={INPUT_CLASS} />
      {hint && <span className="ui text-xs text-ink3 block mt-1">{hint}</span>}
    </label>
  );
}

function TextArea({ label, name, defaultValue, rows, hint }: { label: string; name: string; defaultValue: string; rows: number; hint?: string }) {
  return (
    <label className="block">
      <span className="ui text-xs uppercase text-ink3">{label}</span>
      <textarea name={name} defaultValue={defaultValue} rows={rows} className={INPUT_CLASS} />
      {hint && <span className="ui text-xs text-ink3 block mt-1">{hint}</span>}
    </label>
  );
}

interface EditorialInputProps {
  field: EditorialField;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
  /** A textarea when set, an input otherwise. */
  rows?: number;
  /** A request is writing this field: dimmed, read-only, `aria-busy`. */
  busy: boolean;
  /** The per-field "Redo" button; null on a new place, where there is nothing to generate from. */
  redo: { onClick: () => void; disabled: boolean } | null;
}

/**
 * One controlled editorial field with its label row. The `name` is unchanged
 * so Save submits exactly what the page shows, generated or typed.
 */
function EditorialInput({ field, label, value, onChange, hint, rows, busy, redo }: EditorialInputProps) {
  const id = `editorial-${field}`;
  const className = `${INPUT_CLASS} read-only:cursor-progress ${busy ? 'opacity-50' : ''}`.trim();
  const shared = {
    id,
    name: field,
    value,
    readOnly: busy,
    'aria-busy': busy || undefined,
    onChange: (e: { currentTarget: { value: string } }) => onChange(e.currentTarget.value),
  };
  let control: ReactNode;
  if (rows !== undefined) control = <textarea {...shared} rows={rows} className={className} />;
  else control = <input {...shared} className={className} />;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="ui text-xs uppercase text-ink3">{label}</label>
        {redo && (
          <button
            type="button"
            onClick={redo.onClick}
            disabled={redo.disabled}
            aria-label={`Regenerate ${label}`}
            className="ui text-xs uppercase text-ink3 hover:text-ink disabled:cursor-progress disabled:opacity-60"
          >
            Redo
          </button>
        )}
      </div>
      {control}
      <span className="ui text-xs text-ink3 block mt-1">{hint}</span>
    </div>
  );
}
