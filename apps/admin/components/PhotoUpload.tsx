'use client';

import { useRef, useState } from 'react';

interface Props {
  name: string;
  prefix: 'tag' | 'place';
  initialUrl?: string | null;
  label?: string;
  help?: string;
}

export function PhotoUpload({ name, prefix, initialUrl, label, help }: Props) {
  const [url, setUrl] = useState(initialUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { setError('File too large (max 10MB).'); return; }
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('prefix', prefix);
      const res = await fetch('/api/admin/uploads', { method: 'POST', body: fd, credentials: 'same-origin' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `Upload failed (${res.status})` }));
        setError(body.error ?? 'Upload failed');
        return;
      }
      const { url: newUrl } = await res.json();
      setUrl(newUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <span className="ui text-xs uppercase text-ink3">{label}</span>}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) onPick(f); }}
        className="block border-2 border-dashed border-hairline rounded-card p-4 text-center cursor-pointer hover:border-accent"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="max-h-40 mx-auto rounded" />
        ) : (
          <div className="ui text-sm text-ink3">{uploading ? 'Uploading…' : 'Drop image or tap to browse (max 10MB)'}</div>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden
               onChange={(e) => { if (e.target.files?.[0]) onPick(e.target.files[0]); }} />
      </div>
      {error && <p className="ui text-sm" style={{ color: '#C44' }}>{error}</p>}
      <input type="url" name={name} value={url} onChange={(e) => setUrl(e.target.value)}
             placeholder="https://…"
             className="w-full p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent" />
      {help && <p className="ui text-xs text-ink3">{help}</p>}
    </div>
  );
}
