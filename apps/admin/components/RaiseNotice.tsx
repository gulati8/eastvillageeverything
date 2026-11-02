'use client';

import { useEffect } from 'react';
import { useNotices } from './Notices';
import type { NoticeKind } from '../lib/notices';

interface Props {
  kind: NoticeKind;
  title: string;
  detail?: string;
}

/**
 * Raises a notice for something a server component already knows about (the
 * login page's `?error=` bounce). The notice lives as long as this render: a
 * fresh navigation re-renders the element and raises it again, so a repeated
 * identical error still shows, and React strict mode's double effect leaves
 * exactly one card on screen.
 */
export function RaiseNotice({ kind, title, detail }: Props) {
  const { notify, dismiss } = useNotices();
  useEffect(() => {
    const id = notify({ kind, title, detail });
    return () => dismiss(id);
  });
  return null;
}
