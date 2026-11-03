'use client';

import { useState } from 'react';
import { ReturnTo } from './ReturnTo';
import { SlugLine } from './SlugLine';
import { SubmitButton } from './SubmitButton';

interface Props {
  action: (fd: FormData) => void;
  defaultValues?: { display: string; is_default: boolean };
}

export function NeighborhoodForm({ action, defaultValues = { display: '', is_default: false } }: Props) {
  const [display, setDisplay] = useState(defaultValues.display);
  return (
    <form action={action} className="space-y-4">
      <ReturnTo />
      <label className="block">
        <span className="ui text-xs uppercase text-ink3">Display name</span>
        <input
          name="display" required value={display} onChange={(e) => setDisplay(e.target.value)}
          className="w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
        />
      </label>
      <SlugLine display={display} />
      <label className="flex items-center gap-2">
        <input type="checkbox" name="is_default" defaultChecked={defaultValues.is_default} />
        <span className="ui text-sm">Set as default neighborhood</span>
      </label>
      <div className="pt-2 border-t border-hairline">
        <SubmitButton pendingLabel="Saving…" className="ui text-sm uppercase bg-ink text-paper px-4 py-2 rounded-input disabled:opacity-80">
          Save
        </SubmitButton>
      </div>
    </form>
  );
}
