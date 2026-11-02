'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { SortableList } from '../../components/SortableList';
import { useNotices } from '../../components/Notices';
import { reorderTags } from '../../lib/actions/tags';

interface Tag { id: string; value: string; display: string; sort_order: number; }

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [pending, startTransition] = useTransition();
  const { notify } = useNotices();

  useEffect(() => {
    fetch(`${basePath}/api/admin/tags`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((rows: Tag[]) => setTags(rows));
  }, []);

  const onReorder = (next: Tag[]) => {
    const previous = tags;
    setTags(next);
    startTransition(async () => {
      try {
        const result = await reorderTags(next.map((t) => t.id));
        if (result.ok) {
          notify({ kind: 'success', title: 'Order saved' });
        } else {
          setTags(previous);
          notify({ kind: 'error', title: 'Order not saved', detail: result.error });
        }
      } catch (e) {
        setTags(previous);
        notify({ kind: 'error', title: 'Order not saved', detail: e instanceof Error ? e.message : 'Try again.' });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Tags</h1>
        <Link href="/tags/new" className="ui text-sm uppercase bg-ink text-paper px-4 py-2 rounded-input">+ New</Link>
      </div>
      <SortableList
        items={tags}
        onReorder={onReorder}
        renderItem={(t, handle) => (
          <>
            <span {...handle} className="ui text-ink3 cursor-grab select-none px-2">⋮⋮</span>
            <Link href={`/tags/${t.id}/edit`} className="flex-1 hover:text-accent">
              {t.display} <span className="ui text-xs text-ink3">{t.value}</span>
            </Link>
          </>
        )}
      />
      {pending && <p className="ui text-xs text-ink3">Saving order…</p>}
      {tags.length === 0 && <p className="ui text-sm text-ink3">No tags yet.</p>}
    </div>
  );
}
