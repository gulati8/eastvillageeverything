'use client';

import { useRef } from 'react';

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
      <button
        type="button"
        onClick={() => { if (confirm(confirmText)) formRef.current?.requestSubmit(); }}
        className="ui text-sm uppercase"
        style={{ color: '#C44' }}
      >
        {label}
      </button>
    </form>
  );
}
