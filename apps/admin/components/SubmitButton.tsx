'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { useStale } from './VersionWatch';
import { STALE_BUTTON_LABEL } from '../lib/stale';

interface Props {
  children: ReactNode;
  /** Label shown while the enclosing form's action is running. */
  pendingLabel: string;
  className?: string;
  /** `button` lets a caller gate the submit behind `confirm()`; defaults to `submit`. */
  type?: 'submit' | 'button';
  onClick?: () => void;
  style?: CSSProperties;
  /** Disabled while the caller runs its own request (Generate editorial, say), with the label unchanged. */
  busy?: boolean;
}

/**
 * Submit button that reads the enclosing `<form>`'s pending state. While the
 * server action runs it is disabled, shows `pendingLabel`, and carries a busy
 * outline so it reads as in progress on a phone with no hover state.
 * Must be rendered inside the form it reports on (`useFormStatus`).
 *
 * When `VersionWatch` has seen a redeploy under this tab the button is
 * disabled with "Reload first": the action would fail with
 * "Failed to find Server Action" and nothing would be saved.
 */
export function SubmitButton({ children, pendingLabel, className = '', type = 'submit', onClick, style, busy = false }: Props) {
  const { pending } = useFormStatus();
  const stale = useStale();
  const disabled = pending || stale || busy;
  const label = pending ? pendingLabel : stale ? STALE_BUTTON_LABEL : children;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-busy={pending || undefined}
      aria-disabled={disabled || undefined}
      title={stale && !pending ? 'The admin was updated. Reload the page to continue.' : undefined}
      style={style}
      className={`${className} ${pending ? 'cursor-progress opacity-80 outline outline-2 outline-offset-2 outline-accent' : ''} ${stale && !pending ? 'cursor-not-allowed opacity-60' : ''} ${busy && !pending && !stale ? 'opacity-60' : ''}`.trim()}
    >
      {label}
    </button>
  );
}
