'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { usePathname } from 'next/navigation';
import type { PlacePhotoResponse } from '@eve/shared-types';
import { useNotices } from './Notices';
import type { NoticeInput } from '../lib/notices';
import { makeFirstPlacePhoto, removePlacePhoto, setPlacePhotoCredit } from '../lib/actions/photos';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export interface GoogleFallback {
  url: string;
  attribution: string | null;
}

interface Props {
  placeId: string;
  photos: PlacePhotoResponse[];
  placeName: string;
  googleFallback: GoogleFallback | null;
}

interface Upload {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: 'queued' | 'uploading' | 'failed';
}

type UploadFailure =
  | { kind: 'signed-out' }
  | { kind: 'server'; message: string }
  | { kind: 'network' };

type UploadOutcome =
  | { ok: true; photo: PlacePhotoResponse }
  | { ok: false; failure: UploadFailure };

let uploadCounter = 0;

/**
 * Posts one file to the upload route with `place_id`, so the server both
 * stores and attaches it. XMLHttpRequest because `fetch` has no upload
 * progress events.
 */
function sendUpload(file: File, placeId: string, onProgress: (pct: number) => void): Promise<UploadOutcome> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${basePath}/api/admin/uploads`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    const dropped = () => resolve({ ok: false, failure: { kind: 'network' } });
    xhr.onerror = dropped;
    xhr.onabort = dropped;
    xhr.ontimeout = dropped;
    xhr.onload = () => {
      if (xhr.status === 401) {
        resolve({ ok: false, failure: { kind: 'signed-out' } });
        return;
      }
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
      if (xhr.status >= 200 && xhr.status < 300) {
        const photo = record?.photo as PlacePhotoResponse | undefined;
        if (photo && typeof photo.url === 'string') {
          resolve({ ok: true, photo });
          return;
        }
        // 2xx with a body we cannot read: treat like a dropped connection.
        dropped();
        return;
      }
      const message = typeof record?.error === 'string' ? record.error : null;
      if (message) resolve({ ok: false, failure: { kind: 'server', message } });
      else dropped();
    };
    const fd = new FormData();
    fd.append('file', file);
    fd.append('prefix', 'place');
    fd.append('place_id', placeId);
    xhr.send(fd);
  });
}

function describeFailure(failure: UploadFailure, pathname: string): NoticeInput {
  switch (failure.kind) {
    case 'signed-out':
      return {
        kind: 'error',
        title: 'You were signed out. Sign in again.',
        action: { label: 'Sign in', href: `/login?next=${encodeURIComponent(pathname)}` },
      };
    case 'server':
      return { kind: 'error', title: 'Photo not saved', detail: failure.message };
    default:
      return { kind: 'error', title: 'Connection dropped. Try again.' };
  }
}

function formatBytes(n: number): string {
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function PlacePhotos({ placeId, photos: initialPhotos, placeName, googleFallback }: Props) {
  const [photos, setPhotos] = useState<PlacePhotoResponse[]>(initialPhotos);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { notify } = useNotices();
  const pathname = usePathname();
  const fileRef = useRef<HTMLInputElement>(null);
  const queue = useRef<string[]>([]);
  const pumping = useRef(false);
  const files = useRef(new Map<string, { file: File; previewUrl: string }>());

  // Release every preview URL still held when the strip unmounts.
  useEffect(() => {
    const held = files.current;
    return () => {
      for (const { previewUrl } of held.values()) URL.revokeObjectURL(previewUrl);
      held.clear();
    };
  }, []);

  const patchUpload = (id: string, patch: Partial<Upload>) =>
    setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const dropUpload = (id: string) => {
    const held = files.current.get(id);
    if (held) URL.revokeObjectURL(held.previewUrl);
    files.current.delete(id);
    setUploads((list) => list.filter((u) => u.id !== id));
  };

  // Uploads run one at a time so progress and the saved-photo order match
  // the order the files were picked in.
  const pump = useCallback(async () => {
    if (pumping.current) return;
    pumping.current = true;
    try {
      while (queue.current.length > 0) {
        const id = queue.current.shift()!;
        const held = files.current.get(id);
        if (!held) continue;
        patchUpload(id, { status: 'uploading', progress: 0 });
        // On a phone the strip shows one card at a time; bring the one in progress into view.
        document.querySelector(`[data-upload-id="${id}"]`)?.scrollIntoView({ inline: 'start', block: 'nearest', behavior: 'smooth' });
        const result = await sendUpload(held.file, placeId, (pct) => patchUpload(id, { progress: pct }));
        if (result.ok) {
          const photo = result.photo;
          setPhotos((list) => (list.some((p) => p.id === photo.id) ? list : [...list, photo]));
          dropUpload(id);
          notify({ kind: 'success', title: `Photo saved to ${placeName}` });
        } else {
          patchUpload(id, { status: 'failed' });
          notify(describeFailure(result.failure, pathname));
        }
      }
    } finally {
      pumping.current = false;
    }
  }, [placeId, placeName, pathname, notify]);

  const enqueue = (picked: FileList | File[]) => {
    for (const file of Array.from(picked)) {
      if (file.size > MAX_BYTES) {
        notify({
          kind: 'error',
          title: `${file.name} is too large`,
          detail: `${formatBytes(file.size)}; the limit is 10 MB.`,
        });
        continue;
      }
      uploadCounter += 1;
      const id = `u${Date.now().toString(36)}-${uploadCounter}`;
      const previewUrl = URL.createObjectURL(file);
      files.current.set(id, { file, previewUrl });
      setUploads((list) => [...list, { id, file, previewUrl, progress: 0, status: 'queued' }]);
      queue.current.push(id);
    }
    void pump();
  };

  const retry = (id: string) => {
    patchUpload(id, { status: 'queued', progress: 0 });
    queue.current.push(id);
    void pump();
  };

  const runAction = async (
    id: string,
    call: () => Promise<{ ok: true; photos: PlacePhotoResponse[] } | { ok: false; error: string }>,
    success: NoticeInput,
    failureTitle: string,
  ) => {
    setBusyId(id);
    try {
      const result = await call();
      if (result.ok) {
        setPhotos(result.photos);
        notify(success);
      } else {
        notify({ kind: 'error', title: failureTitle, detail: result.error });
      }
    } catch (e) {
      notify({ kind: 'error', title: failureTitle, detail: e instanceof Error && e.message ? e.message : 'Try again.' });
    } finally {
      setBusyId(null);
    }
  };

  // "Featured" is the user's word for the position-0 photo: the one the app
  // and the admin list show. Only one photo can hold it.
  const onFeature = (photo: PlacePhotoResponse) => {
    if (!photo.id) return;
    void runAction(
      photo.id,
      () => makeFirstPlacePhoto(photo.id!),
      { kind: 'success', title: 'Featured', detail: `The app shows this photo for ${placeName}.` },
      'Order not saved',
    );
  };

  const onRemove = (photo: PlacePhotoResponse) => {
    if (!photo.id) return;
    if (!confirm('Remove this photo? This cannot be undone.')) return;
    void runAction(
      photo.id,
      () => removePlacePhoto(photo.id!),
      { kind: 'success', title: 'Photo removed' },
      'Photo not removed',
    );
  };

  const onCredit = (photo: PlacePhotoResponse, raw: string) => {
    if (!photo.id) return;
    const credit = raw.trim();
    if (credit === (photo.credit ?? '')) return;
    void runAction(
      photo.id,
      () => setPlacePhotoCredit(photo.id!, credit),
      { kind: 'success', title: 'Credit saved' },
      'Credit not saved',
    );
  };

  const showGoogle = photos.length === 0 && googleFallback !== null;
  const showEmptyHint = photos.length === 0 && googleFallback === null && uploads.length === 0;
  // Photo cards plus the Google card (never both at once); the add card and
  // in-flight uploads do not count.
  const cardCount = photos.length + (showGoogle ? 1 : 0);
  const hint = showGoogle
    ? 'No photos yet'
    : cardCount >= 2
      ? `${cardCount} photos · swipe for more`
      : 'Saved the moment you pick them';
  const openPicker = () => fileRef.current?.click();

  return (
    <section aria-label="Photos" className="rounded-card border border-hairline bg-paper2 p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-2xl">Photos</h2>
        <span className="ui text-xs uppercase text-ink3">{hint}</span>
      </div>

      {/* The primary way in. The add card at the end of the strip is a second
          entry point, but on a phone it sits off-screen to the right. */}
      <button
        type="button"
        onClick={openPicker}
        className="ui mb-3 w-full rounded-input bg-ink px-4 py-3 text-sm uppercase text-paper hover:opacity-90"
      >
        Add photo
      </button>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) enqueue(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
        {showGoogle && googleFallback && (
          <Card>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={googleFallback.url} alt="" className="aspect-[4/3] w-full object-cover" />
            <div className="space-y-1 p-3">
              <Badge>Google photo</Badge>
              <p className="text-sm text-ink2">
                {googleFallback.attribution ? `Google photo by ${googleFallback.attribution}.` : 'Google photo.'}{' '}
                Shown in the app until you add one.
              </p>
            </div>
          </Card>
        )}

        {photos.map((photo, index) => {
          const busy = busyId === photo.id;
          return (
            <Card key={photo.id ?? `p${index}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.thumb_url ?? photo.url} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-2 p-3">
                {index === 0 && <Badge>Featured</Badge>}
                <label className="block">
                  <span className="ui text-xs uppercase text-ink3">Credit</span>
                  <input
                    type="text"
                    defaultValue={photo.credit ?? ''}
                    placeholder="Who took it"
                    disabled={busy}
                    onBlur={(e) => onCredit(photo, e.currentTarget.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    className="mt-1 w-full rounded-input border border-hairline bg-paper p-2 text-sm focus:border-accent focus:outline-none disabled:opacity-60"
                  />
                </label>
                <div className="flex items-center justify-between gap-2">
                  {index > 0 ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onFeature(photo)}
                      className="ui rounded-input border border-hairline bg-paper px-3 py-2 text-xs uppercase hover:border-accent disabled:opacity-60"
                    >
                      Feature
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRemove(photo)}
                    className="ui px-2 py-2 text-xs uppercase disabled:opacity-60"
                    style={{ color: '#C44' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </Card>
          );
        })}

        {uploads.map((u) => (
          <Card key={u.id} uploadId={u.id}>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.previewUrl} alt="" className={`aspect-[4/3] w-full object-cover ${u.status === 'failed' ? 'opacity-40' : 'opacity-60'}`} />
              {u.status !== 'failed' && (
                <div className="absolute inset-0 grid place-items-center">
                  <span className="ui rounded-full bg-paper/90 px-3 py-1 text-sm text-ink">
                    {u.status === 'queued' ? 'Waiting…' : `${u.progress}%`}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2 p-3">
              {u.status === 'failed' ? (
                <>
                  <p className="ui text-sm" style={{ color: '#C44' }}>Upload failed</p>
                  <p className="truncate text-sm text-ink2" title={u.file.name}>{u.file.name}</p>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => retry(u.id)}
                      className="ui rounded-input border border-hairline bg-paper px-3 py-2 text-xs uppercase hover:border-accent"
                    >
                      Try again
                    </button>
                    <button type="button" onClick={() => dropUpload(u.id)} className="ui px-2 py-2 text-xs uppercase text-ink3 hover:text-ink">
                      Discard
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="ui text-sm text-ink">{u.status === 'queued' ? 'Waiting to upload' : 'Uploading…'}</p>
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={u.progress}
                    aria-label={`Uploading ${u.file.name}`}
                    className="h-1.5 w-full overflow-hidden rounded-full bg-hairline"
                  >
                    <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${u.progress}%` }} />
                  </div>
                  <p className="truncate text-sm text-ink2" title={u.file.name}>{u.file.name}</p>
                </>
              )}
            </div>
          </Card>
        ))}

        <Card dashed>
          <button
            type="button"
            onClick={openPicker}
            className="ui grid aspect-[4/3] w-full place-items-center bg-paper text-sm uppercase text-ink hover:text-accent"
          >
            <span className="grid place-items-center gap-1">
              <span className="text-3xl leading-none" aria-hidden="true">+</span>
              Add photo
            </span>
          </button>
          <div className="p-3">
            <p className="text-sm text-ink2">
              {showEmptyHint
                ? "The app shows the place's initials until there is a photo."
                : 'Pick one or several from the camera or library. Each one saves as soon as it finishes.'}
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}

function Card({ children, dashed = false, uploadId }: { children: React.ReactNode; dashed?: boolean; uploadId?: string }) {
  return (
    <div
      data-upload-id={uploadId}
      className={`w-[86%] shrink-0 snap-start overflow-hidden rounded-card border bg-paper md:w-[18rem] ${dashed ? 'border-2 border-dashed border-hairline' : 'border-hairline'}`}
    >
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="ui inline-block rounded-chip bg-paper2 px-2 py-0.5 text-[10px] uppercase text-ink2">{children}</span>
  );
}
