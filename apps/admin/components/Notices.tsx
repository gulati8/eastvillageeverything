'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState,
  type KeyboardEvent, type PointerEvent, type ReactNode,
} from 'react';
import Link from 'next/link';
import {
  nextExpiry, reduceNotices, stripeClass, type Notice, type NoticeInput,
} from '../lib/notices';

interface NoticesApi {
  notify: (input: NoticeInput) => string;
  dismiss: (id: string) => void;
}

// The API object is referentially stable so `useNotices()` callers never
// re-render when the stack changes; only `NoticeStack` sees the state.
const ApiContext = createContext<NoticesApi | null>(null);

let counter = 0;
function nextId(): string {
  counter += 1;
  return `n${Date.now().toString(36)}-${counter}`;
}

export function NoticesProvider({ children }: { children: ReactNode }) {
  const [notices, dispatch] = useReducer(reduceNotices, []);

  const notify = useCallback((input: NoticeInput) => {
    const id = nextId();
    dispatch({ type: 'add', id, input, now: Date.now() });
    return id;
  }, []);
  const dismiss = useCallback((id: string) => dispatch({ type: 'dismiss', id }), []);
  const api = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  // One timer for the soonest expiry; re-armed whenever the stack changes.
  useEffect(() => {
    const at = nextExpiry(notices);
    if (at === null) return;
    const t = setTimeout(() => dispatch({ type: 'tick', now: Date.now() }), Math.max(0, at - Date.now()));
    return () => clearTimeout(t);
  }, [notices]);

  return (
    <ApiContext.Provider value={api}>
      {children}
      <NoticeStack
        notices={notices}
        onDismiss={dismiss}
        onPause={(id) => dispatch({ type: 'pause', id, now: Date.now() })}
        onResume={(id) => dispatch({ type: 'resume', id, now: Date.now() })}
      />
    </ApiContext.Provider>
  );
}

export function useNotices(): NoticesApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useNotices() must be used inside <NoticesProvider>');
  return api;
}

interface StackProps {
  notices: Notice[];
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}

function NoticeStack({ notices, onDismiss, onPause, onResume }: StackProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-4"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
    >
      {notices.map((n) => (
        <NoticeCard key={n.id} notice={n} onDismiss={onDismiss} onPause={onPause} onResume={onResume} />
      ))}
    </div>
  );
}

const SWIPE_PX = 60;

interface CardProps {
  notice: Notice;
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}

function NoticeCard({ notice, onDismiss, onPause, onResume }: CardProps) {
  const [dx, setDx] = useState(0);
  const drag = useRef<{ pointerId: number; startX: number } | null>(null);
  const hovering = useRef(false);
  const touching = useRef(false);

  const syncPause = () => {
    if (hovering.current || touching.current) onPause(notice.id);
    else onResume(notice.id);
  };

  const onPointerEnter = () => { hovering.current = true; syncPause(); };
  const onPointerLeave = () => { hovering.current = false; syncPause(); };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    drag.current = { pointerId: e.pointerId, startX: e.clientX };
    touching.current = true;
    syncPause();
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    setDx(e.clientX - drag.current.startX);
  };
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    const moved = e.clientX - drag.current.startX;
    drag.current = null;
    touching.current = false;
    if (Math.abs(moved) > SWIPE_PX) {
      onDismiss(notice.id);
      return;
    }
    setDx(0);
    syncPause();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onDismiss(notice.id);
    }
  };

  const action = notice.action;

  return (
    <div
      tabIndex={0}
      data-notice-kind={notice.kind}
      className={`notice-card pointer-events-auto w-full max-w-md touch-pan-y select-none rounded-card border border-hairline border-l-[3px] bg-paper2 shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-accent ${stripeClass(notice.kind)}`}
      style={{
        transform: dx ? `translateX(${dx}px)` : undefined,
        opacity: dx ? Math.max(0.3, 1 - Math.abs(dx) / 240) : undefined,
        transition: drag.current ? 'none' : 'transform 150ms ease-out, opacity 150ms ease-out',
      }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="ui text-sm text-ink">{notice.title}</p>
          {notice.detail && <p className="mt-0.5 text-sm text-ink2">{notice.detail}</p>}
          {action && (
            'href' in action ? (
              <Link
                href={action.href}
                onClick={() => onDismiss(notice.id)}
                className="ui mt-2 inline-block rounded-input border border-hairline bg-paper px-3 py-1 text-xs uppercase text-ink hover:border-accent"
              >
                {action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => { action.onClick(); onDismiss(notice.id); }}
                className="ui mt-2 inline-block rounded-input border border-hairline bg-paper px-3 py-1 text-xs uppercase text-ink hover:border-accent"
              >
                {action.label}
              </button>
            )
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => onDismiss(notice.id)}
          className="ui -mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-base leading-none text-ink3 hover:bg-paper hover:text-ink"
        >
          ×
        </button>
      </div>
    </div>
  );
}
