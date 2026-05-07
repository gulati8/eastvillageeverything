'use client';

import { useState } from 'react';
import { SortableList } from './SortableList';

interface Tag { id: string; value: string; display: string; }

interface Props {
  name: string;
  allTags: Tag[];
  initial: Tag[];
}

export function TagPicker({ name, allTags, initial }: Props) {
  const [selected, setSelected] = useState<Tag[]>(initial);
  const [query, setQuery] = useState('');
  const inlineCreateAvailable = false;

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

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type to filter or add"
        className="w-full p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
      />
      {(query.length > 0) && (
        <div className="border border-hairline rounded-input bg-paper2 max-h-48 overflow-auto">
          {suggestions.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setSelected([...selected, t]); setQuery(''); }}
              className="block w-full text-left px-3 py-2 hover:bg-paper"
            >
              {t.display} <span className="ui text-xs text-ink3">{t.value}</span>
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              disabled={!inlineCreateAvailable}
              className="block w-full text-left px-3 py-2 hover:bg-paper text-accent disabled:opacity-50 disabled:cursor-not-allowed"
              title={inlineCreateAvailable ? '' : 'Coming in Task 19'}
            >
              + Create &quot;{query.trim()}&quot;
            </button>
          )}
        </div>
      )}

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
