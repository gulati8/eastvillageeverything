'use client';

import { useRef, useState, useTransition } from 'react';
import { SortableList } from './SortableList';
import { createTagInline } from '../lib/actions/tags';

interface Tag { id: string; value: string; display: string; }

interface Props {
  name: string;
  allTags: Tag[];
  initial: Tag[];
}

export function TagPicker({ name, allTags, initial }: Props) {
  const [selected, setSelected] = useState<Tag[]>(initial);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inlineCreateAvailable = true;

  const remaining = allTags.filter((t) => !selected.some((s) => s.id === t.id));
  const suggestions = remaining.filter((t) =>
    t.display.toLowerCase().includes(query.toLowerCase()) ||
    t.value.toLowerCase().includes(query.toLowerCase())
  );
  const exactMatch = remaining.some((t) => t.display.toLowerCase() === query.trim().toLowerCase());
  const showCreate = query.trim().length > 0 && !exactMatch;

  return (
    <div className="space-y-2">
      <span className="ui text-xs uppercase text-ink3">Tags</span>

      <div
        className="relative"
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
        }}
      >
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          placeholder="Filter or add a tag"
          className="w-full p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
        />
        {open && (
          <div className="absolute left-0 right-0 z-20 mt-1 border border-hairline rounded-input bg-paper2 max-h-64 overflow-auto shadow-lg">
            {suggestions.length === 0 && query.trim().length === 0 && (
              <div className="ui px-3 py-2 text-xs uppercase text-ink3">All tags are selected.</div>
            )}
            {suggestions.length === 0 && query.trim().length > 0 && !showCreate && (
              <div className="ui px-3 py-2 text-xs uppercase text-ink3">No matching tags.</div>
            )}
            {suggestions.length > 0 && (
              <div className="ui border-b border-hairline px-3 py-2 text-xs uppercase text-ink3">
                {query.trim().length > 0 ? 'Matching tags' : 'Available tags'}
              </div>
            )}
            {suggestions.map((t) => (
              <button
                key={t.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setSelected([...selected, t]); setQuery(''); setOpen(false); }}
                className="block w-full text-left px-3 py-2 hover:bg-paper"
              >
                {t.display} <span className="ui text-xs text-ink3">{t.value}</span>
              </button>
            ))}
            {showCreate && (
              <button
                type="button"
                disabled={!inlineCreateAvailable || pending}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const display = query.trim();
                  startTransition(async () => {
                    const created = await createTagInline(display);
                    if (created) {
                      setSelected((prev) => [...prev, created]);
                      setQuery('');
                      setOpen(false);
                    }
                  });
                }}
                className="block w-full text-left px-3 py-2 hover:bg-paper text-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Create &quot;{query.trim()}&quot;
              </button>
            )}
          </div>
        )}
      </div>
      <SortableList
        items={selected}
        onReorder={setSelected}
        renderItem={(t, handle) => (
          <>
            <span {...handle} className="ui text-ink3 cursor-grab select-none px-2">⋮⋮</span>
            <span className="flex-1">{t.display}</span>
            <button
              type="button"
              onClick={() => setSelected(selected.filter((s) => s.id !== t.id))}
              className="ui text-xs text-ink3 hover:text-ink px-2"
            >
              ×
            </button>
          </>
        )}
      />

      <p className="ui text-xs text-ink3">First tag drives the place&apos;s meta line on the mobile feed. Drag to reorder.</p>

      <input type="hidden" name={name} value={JSON.stringify(selected.map((t) => t.id))} />
    </div>
  );
}
