'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

interface Props {
  children: ReactNode;
  /** Label shown while the enclosing form's action is running. */
  pendingLabel: string;
  className?: string;
  /** `button` lets a caller gate the submit behind `confirm()`; defaults to `submit`. */
  type?: 'submit' | 'button';
  onClick?: () => void;
  style?: CSSProperties;
}

/**
 * Submit button that reads the enclosing `<form>`'s pending state. While the
 * server action runs it is disabled, shows `pendingLabel`, and carries a busy
 * outline so it reads as in progress on a phone with no hover state.
 * Must be rendered inside the form it reports on (`useFormStatus`).
 */
export function SubmitButton({ children, pendingLabel, className = '', type = 'submit', onClick, style }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={pending}
      aria-busy={pending || undefined}
      aria-disabled={pending || undefined}
      style={style}
      className={`${className} ${pending ? 'cursor-progress opacity-80 outline outline-2 outline-offset-2 outline-accent' : ''}`.trim()}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
