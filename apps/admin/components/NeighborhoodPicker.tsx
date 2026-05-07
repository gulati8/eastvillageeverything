'use client';

import { useState, useTransition } from 'react';
import { createNeighborhoodInline } from '../lib/actions/neighborhoods';

interface Neighborhood { id: string; value: string; display: string; }

interface Props {
  name: string;
  options: Neighborhood[];
  initialId: string;
}

export function NeighborhoodPicker({ name, options, initialId }: Props) {
  const [list, setList] = useState<Neighborhood[]>(options);
  const [selectedId, setSelectedId] = useState(initialId);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const inlineCreateAvailable = true;

  const filtered = list.filter((n) => n.display.toLowerCase().includes(query.toLowerCase()));
  const exactMatch = list.some((n) => n.display.toLowerCase() === query.trim().toLowerCase());
  const showCreate = query.trim().length > 0 && !exactMatch;
  const selected = list.find((n) => n.id === selectedId);

  return (
    <div className="space-y-2 relative">
      <span className="ui text-xs uppercase text-ink3">Neighborhood</span>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-3 rounded-input bg-paper border border-hairline text-left flex items-center justify-between"
      >
        <span>{selected?.display ?? 'Select…'}</span>
        <span className="ui text-ink3">▾</span>
      </button>

      {open && (
        <div className="absolute z-10 left-0 right-0 mt-1 border border-hairline rounded-input bg-paper2 max-h-64 overflow-auto">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to filter"
            className="w-full p-3 bg-paper border-b border-hairline focus:outline-none"
          />
          {filtered.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => { setSelectedId(n.id); setOpen(false); setQuery(''); }}
              className="block w-full text-left px-3 py-2 hover:bg-paper"
            >
              {n.display}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              disabled={!inlineCreateAvailable || pending}
              onClick={() => {
                const display = query.trim();
                startTransition(async () => {
                  const created = await createNeighborhoodInline(display);
                  if (created) {
                    setList((prev) => [...prev, created]);
                    setSelectedId(created.id);
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

      <input type="hidden" name={name} value={selectedId} />
    </div>
  );
}
