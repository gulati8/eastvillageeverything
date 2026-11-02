'use client';

import { useRef } from 'react';
import { ReturnTo } from './ReturnTo';
import { SubmitButton } from './SubmitButton';

interface Props {
  action: (formData: FormData) => void;
  id: string;
  label?: string;
  confirmText?: string;
}

export function DeleteButton({ action, id, label = 'Delete', confirmText = 'Delete this? This cannot be undone.' }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <ReturnTo />
      <SubmitButton
        type="button"
        pendingLabel="Deleting…"
        onClick={() => { if (confirm(confirmText)) formRef.current?.requestSubmit(); }}
        className="ui text-sm uppercase disabled:opacity-80"
        style={{ color: '#C44' }}
      >
        {label}
      </SubmitButton>
    </form>
  );
}
