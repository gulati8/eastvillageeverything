/**
 * Pure state for the admin's feedback overlay. No React, no DOM: the
 * provider in `components/Notices.tsx` drives this reducer with a clock
 * value and schedules a single timer from `nextExpiry()`.
 *
 * Success and info notices expire `AUTO_DISMISS_MS` after they are added;
 * error notices and notices added with `sticky: true` stay until dismissed.
 * A paused notice (hovered, touched) keeps its remaining time and resumes
 * from there.
 */

export type NoticeKind = 'success' | 'error' | 'info';

export type NoticeAction =
  | { label: string; onClick: () => void }
  | { label: string; href: string };

export interface NoticeInput {
  kind: NoticeKind;
  title: string;
  detail?: string;
  action?: NoticeAction;
  /** Stay until dismissed even for success/info (an out-of-date page, say). */
  sticky?: boolean;
}

export interface Notice extends NoticeInput {
  id: string;
  /** Epoch ms at which the notice should disappear; null = sticky or paused. */
  expiresAt: number | null;
  /** Remaining ms while paused; null when not paused. */
  remainingMs: number | null;
}

export type NoticeEvent =
  | { type: 'add'; id: string; input: NoticeInput; now: number }
  | { type: 'dismiss'; id: string }
  | { type: 'pause'; id: string; now: number }
  | { type: 'resume'; id: string; now: number }
  | { type: 'tick'; now: number };

export const AUTO_DISMISS_MS = 4000;

export function autoDismissMs(kind: NoticeKind, sticky = false): number | null {
  return kind === 'error' || sticky ? null : AUTO_DISMISS_MS;
}

export function reduceNotices(state: Notice[], event: NoticeEvent): Notice[] {
  switch (event.type) {
    case 'add': {
      const ttl = autoDismissMs(event.input.kind, event.input.sticky);
      const notice: Notice = {
        ...event.input,
        id: event.id,
        expiresAt: ttl === null ? null : event.now + ttl,
        remainingMs: null,
      };
      return [...state, notice];
    }
    case 'dismiss':
      return state.filter((n) => n.id !== event.id);
    case 'pause':
      return state.map((n) => {
        if (n.id !== event.id || n.expiresAt === null) return n;
        return { ...n, expiresAt: null, remainingMs: Math.max(0, n.expiresAt - event.now) };
      });
    case 'resume':
      return state.map((n) => {
        if (n.id !== event.id || n.remainingMs === null) return n;
        return { ...n, expiresAt: event.now + n.remainingMs, remainingMs: null };
      });
    case 'tick':
      return state.filter((n) => n.expiresAt === null || n.expiresAt > event.now);
    default:
      return state;
  }
}

/** The soonest expiry among unpaused notices, or null when nothing is timed. */
export function nextExpiry(state: Notice[]): number | null {
  let soonest: number | null = null;
  for (const n of state) {
    if (n.expiresAt === null) continue;
    if (soonest === null || n.expiresAt < soonest) soonest = n.expiresAt;
  }
  return soonest;
}

/** Stripe colour per kind. `accent` is the design-token orange. */
export const STRIPE_COLOR: Record<NoticeKind, string> = {
  success: '#3F7D4E',
  error: '#C44',
  info: '#E07B3F',
};

export function stripeClass(kind: NoticeKind): string {
  switch (kind) {
    case 'success':
      return 'border-l-[#3F7D4E]';
    case 'error':
      return 'border-l-[#C44]';
    default:
      return 'border-l-accent';
  }
}

export function isNoticeKind(value: unknown): value is NoticeKind {
  return value === 'success' || value === 'error' || value === 'info';
}
