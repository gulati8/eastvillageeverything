'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNotices } from './Notices';
import { STALE_TITLE, versionChanged } from '../lib/stale';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const POLL_MS = 5 * 60 * 1000;

const StaleContext = createContext(false);

/**
 * True once the server has been redeployed under this tab. `SubmitButton`
 * reads it to refuse a Save that would fail with "Failed to find Server
 * Action". Defaults to false outside the provider.
 */
export function useStale(): boolean {
  return useContext(StaleContext);
}

async function fetchVersionId(): Promise<string | null> {
  try {
    const res = await fetch(`${basePath}/api/admin/version`, { cache: 'no-store', credentials: 'same-origin' });
    if (!res.ok) return null; // 401 when signed out: nothing to compare against.
    const body = (await res.json()) as { id?: unknown };
    return typeof body.id === 'string' ? body.id : null;
  } catch {
    return null; // offline: try again on the next tick.
  }
}

/**
 * Watches the admin's process id (`/api/admin/version`, a UUID made when the
 * server started) on mount, whenever the tab becomes visible, and every five
 * minutes while visible. When it changes the tab is out of date: one sticky
 * info notice asks for a reload and `useStale()` flips to true.
 */
export function VersionWatch({ children }: { children: ReactNode }) {
  const { notify } = useNotices();
  const [stale, setStale] = useState(false);
  const firstId = useRef<string | null>(null);
  const noticeRaised = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const check = async () => {
      const id = await fetchVersionId();
      if (cancelled || id === null) return;
      if (firstId.current === null) {
        firstId.current = id;
        return;
      }
      if (!versionChanged(firstId.current, id)) return;
      setStale(true);
      if (noticeRaised.current) return;
      noticeRaised.current = true;
      notify({
        kind: 'info',
        sticky: true,
        title: STALE_TITLE,
        action: { label: 'Reload', onClick: () => window.location.reload() },
      });
    };

    const stopPolling = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };
    const startPolling = () => {
      stopPolling();
      timer = setInterval(() => void check(), POLL_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void check();
        startPolling();
      } else {
        stopPolling();
      }
    };

    void check();
    if (document.visibilityState === 'visible') startPolling();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [notify]);

  return <StaleContext.Provider value={stale}>{children}</StaleContext.Provider>;
}
