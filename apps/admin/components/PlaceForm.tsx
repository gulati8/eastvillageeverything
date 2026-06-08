'use client';

import { PhotoUpload } from './PhotoUpload';
import { TagPicker } from './TagPicker';
import { NeighborhoodPicker } from './NeighborhoodPicker';

interface Tag { id: string; value: string; display: string; }
interface Neighborhood { id: string; value: string; display: string; }

interface Props {
  action: (formData: FormData) => void;
  defaultValues?: Partial<{
    name: string; address: string; cross_street: string; phone: string; url: string;
    neighborhood_id: string; photo_url: string; photo_credit: string;
    specials: string; notes: string;
    pitch: string; perfect: string; insider: string; vibe: string; crowd: string;
  }>;
  allTags: Tag[];
  selectedTags: Tag[];
  neighborhoods: Neighborhood[];
  showEditorial?: boolean;
}

export function PlaceForm({ action, defaultValues = {}, allTags, selectedTags, neighborhoods }: Props) {
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
  const hasEditorial = Boolean(
    v.pitch?.trim() ||
    v.perfect?.trim() ||
    v.insider?.trim() ||
    v.vibe?.trim() ||
    v.crowd?.trim(),
  );

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="space-y-5">
          <section className="rounded-card border border-hairline bg-paper2 p-4 md:p-5">
            <SectionHeader
              title="Basics"
              description="Required data stays compatible with the old web directory and the mobile app."
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Name" name="name" defaultValue={v.name ?? ''} required />
              <NeighborhoodPicker name="neighborhood_id" options={neighborhoods} initialId={defaultNeighborhood} />
              <Field label="Address" name="address" defaultValue={v.address ?? ''} />
              <Field label="Cross street" name="cross_street" defaultValue={v.cross_street ?? ''} />
              <Field label="Phone" name="phone" defaultValue={v.phone ?? ''} />
              <Field label="Website" name="url" defaultValue={v.url ?? ''} />
            </div>
          </section>

          <section className="rounded-card border border-hairline bg-paper2 p-4 md:p-5">
            <SectionHeader
              title="Tags in mobile order"
              description="The first tag is the headline category the mobile experience uses most prominently."
            />
            <TagPicker name="tag_ids" allTags={allTags} initial={selectedTags} />
          </section>

          <section className="rounded-card border border-hairline bg-paper2 p-4 md:p-5">
            <SectionHeader
              title="Current web fields"
              description="These continue to feed the existing eastvillageeverything.nyc web experience."
            />
            <div className="space-y-3">
              <TextArea label="Specials" name="specials" defaultValue={v.specials ?? ''} rows={3} />
              <TextArea label="Notes" name="notes" defaultValue={v.notes ?? ''} rows={3} />
            </div>
          </section>

          <section className="rounded-card border border-hairline bg-paper2 p-4 md:p-5">
            <SectionHeader
              title="Photo"
              description="Nicholas adds images from camera, photo library, or file upload. No pasted image URLs."
              badge="Crop/resize planned"
            />
            <div className="grid gap-4 md:grid-cols-[minmax(0,18rem)_1fr]">
              <PhotoUpload
                name="photo_url"
                prefix="place"
                initialUrl={v.photo_url ?? null}
                label="Place image"
                help="Next phase: save app-ready crops for list thumbnails and detail hero images."
              />
              <div className="space-y-3">
                <Field label="Photo credit" name="photo_credit" defaultValue={v.photo_credit ?? ''} />
                <div className="rounded-input border border-hairline bg-paper p-3">
                  <p className="ui text-xs uppercase text-ink3">Tracked next</p>
                  <p className="mt-1 text-sm text-ink2">
                    Automatic resize, crop presets, and focal-point adjustment will be added after the safe upload-only flow is in place.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-card border border-hairline bg-paper2 p-4 md:p-5">
            <SectionHeader
              title="Editorial for mobile"
              description="Optional enriched copy. The app and old web must still work when these are blank."
              badge="AI planned"
            />
            <div className="space-y-3">
              <TextAreaWithGenerate label="Pitch" name="pitch" defaultValue={v.pitch ?? ''} rows={2} hint="2 sentences. Friend voice." />
              <FieldWithGenerate label="Perfect when…" name="perfect" defaultValue={v.perfect ?? ''} hint="finishes 'Perfect when…'" />
              <TextAreaWithGenerate label="Insider tip" name="insider" defaultValue={v.insider ?? ''} rows={2} hint="One sentence." />
              <FieldWithGenerate label="Vibe" name="vibe" defaultValue={v.vibe ?? ''} hint="3 words separated by ' · '" />
              <FieldWithGenerate label="Crowd" name="crowd" defaultValue={v.crowd ?? ''} hint="Who's there." />
            </div>
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-5">
          <section className="rounded-card border border-hairline bg-paper2 p-4">
            <div className="ui text-xs uppercase text-ink3">Readiness</div>
            <div className="mt-3 space-y-2">
              <ReadinessRow label="Old web safe" good={hasName} detail={hasName ? 'Name present' : 'Needs name'} />
              <ReadinessRow label="Mobile safe" good={hasName} detail={hasName ? 'Fallbacks available' : 'Needs name'} />
              <ReadinessRow label="Address" good={hasAddress} detail={hasAddress ? 'Good' : 'Optional but useful'} optional />
              <ReadinessRow label="Contact" good={hasContact} detail={hasContact ? 'Phone or web' : 'Optional'} optional />
              <ReadinessRow label="Photo" good={hasPhoto} detail={hasPhoto ? 'Uploaded' : 'Fallback art used'} optional />
              <ReadinessRow label="Tags ordered" good={hasTags} detail={hasTags ? `${selectedTags.length} selected` : 'Optional'} optional />
              <ReadinessRow label="Editorial" good={hasEditorial} detail={hasEditorial ? 'Draft present' : 'Optional'} optional />
            </div>
          </section>

          <section className="rounded-card border border-hairline bg-paper2 p-4">
            <div className="ui text-xs uppercase text-ink3">Guardrails</div>
            <p className="mt-2 text-sm text-ink2">
              New enriched fields are optional. Blank values must not break the public web directory or the mobile app.
            </p>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-hairline bg-paper/95 px-4 py-3 md:static md:mx-0 md:bg-transparent md:px-0 md:pt-4">
        <button type="submit" className="ui text-sm uppercase bg-ink text-paper px-4 py-2 rounded-input">Save</button>
        <span className="ui text-xs uppercase text-ink3">Safe for old web and mobile fallbacks</span>
      </div>
    </form>
  );
}

function SectionHeader({ title, description, badge }: { title: string; description: string; badge?: string }) {
  return (
    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div>
        <h2 className="text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-ink2">{description}</p>
      </div>
      {badge && (
        <span className="ui w-fit rounded-chip bg-paper px-2 py-1 text-xs uppercase text-accent">
          {badge}
        </span>
      )}
    </div>
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

function Field({ label, name, defaultValue, required, hint }: { label: string; name: string; defaultValue: string; required?: boolean; hint?: string }) {
  return (
    <label className="block">
      <span className="ui text-xs uppercase text-ink3">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
      />
      {hint && <span className="ui text-xs text-ink3 block mt-1">{hint}</span>}
    </label>
  );
}

function FieldWithGenerate(props: { label: string; name: string; defaultValue: string; hint?: string }) {
  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <Field {...props} />
      <GenerateButton />
    </div>
  );
}

function TextArea({ label, name, defaultValue, rows, hint }: { label: string; name: string; defaultValue: string; rows: number; hint?: string }) {
  return (
    <label className="block">
      <span className="ui text-xs uppercase text-ink3">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
      />
      {hint && <span className="ui text-xs text-ink3 block mt-1">{hint}</span>}
    </label>
  );
}

function TextAreaWithGenerate(props: { label: string; name: string; defaultValue: string; rows: number; hint?: string }) {
  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <TextArea {...props} />
      <GenerateButton />
    </div>
  );
}

function GenerateButton() {
  return (
    <button
      type="button"
      disabled
      title="Planned next phase: generate editable draft text with an LLM."
      className="ui h-10 rounded-input border border-hairline bg-paper px-3 text-xs uppercase text-ink3 opacity-70"
    >
      Generate AI text
    </button>
  );
}
