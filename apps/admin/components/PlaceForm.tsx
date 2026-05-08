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

export function PlaceForm({ action, defaultValues = {}, allTags, selectedTags, neighborhoods, showEditorial = false }: Props) {
  const v = defaultValues;
  const defaultNeighborhood =
    v.neighborhood_id ||
    neighborhoods.find((n) => n.value === 'east-village')?.id ||
    neighborhoods[0]?.id ||
    '';

  return (
    <form action={action} className="space-y-5">
      <Field label="Name" name="name" defaultValue={v.name ?? ''} required />
      <Field label="Address" name="address" defaultValue={v.address ?? ''} />
      <Field label="Cross street" name="cross_street" defaultValue={v.cross_street ?? ''} />
      <Field label="Phone" name="phone" defaultValue={v.phone ?? ''} />
      <Field label="Website" name="url" defaultValue={v.url ?? ''} />

      <NeighborhoodPicker name="neighborhood_id" options={neighborhoods} initialId={defaultNeighborhood} />

      <PhotoUpload name="photo_url" prefix="place" initialUrl={v.photo_url ?? null} label="Photo" />
      <Field label="Photo credit" name="photo_credit" defaultValue={v.photo_credit ?? ''} />

      <TagPicker name="tag_ids" allTags={allTags} initial={selectedTags} />

      <TextArea label="Specials" name="specials" defaultValue={v.specials ?? ''} rows={3} />
      <TextArea label="Notes" name="notes" defaultValue={v.notes ?? ''} rows={3} />

      {showEditorial && (
        <section className="space-y-3 border-l-2 border-hairline pl-4">
          <TextArea label="Pitch" name="pitch" defaultValue={v.pitch ?? ''} rows={2} hint="2 sentences. Friend voice." />
          <Field label="Perfect when…" name="perfect" defaultValue={v.perfect ?? ''} hint="finishes 'Perfect when…'" />
          <TextArea label="Insider tip" name="insider" defaultValue={v.insider ?? ''} rows={2} hint="One sentence." />
          <Field label="Vibe" name="vibe" defaultValue={v.vibe ?? ''} hint="3 words separated by ' · '" />
          <Field label="Crowd" name="crowd" defaultValue={v.crowd ?? ''} hint="Who's there." />
        </section>
      )}

      <div className="flex items-center gap-3 pt-4 border-t border-hairline">
        <button type="submit" className="ui text-sm uppercase bg-ink text-paper px-4 py-2 rounded-input">Save</button>
      </div>
    </form>
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
