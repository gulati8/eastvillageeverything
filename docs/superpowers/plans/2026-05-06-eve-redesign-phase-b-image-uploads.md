# EVE Redesign — Phase B: Image Upload Infrastructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/design_handoff_eve_2/README.md`. Phase A landed the data columns. Phase B wires the upload pipeline so the editor can fill `tag.fallback_image_url` and `place.photo_url` from the admin without pasting URLs.

---

## Goal

Editor can upload images from the EJS admin: drag a file or click to browse, see it persist, get back a URL the form stores. Works identically against the local filesystem in dev and against AWS S3 in prod, controlled by one env var. Mobile keeps consuming whatever URL ends up in the DB.

## Architecture

`flydrive` v2 (`drivers/fs` for local, `drivers/s3` for S3) sits behind a thin singleton in `src/storage/index.ts`. One env var `STORAGE_BACKEND=local|s3` picks the driver at startup. Upload endpoint `POST /admin/uploads` uses `multer` for multipart parsing, hands the buffer to `flydrive.put()`, returns the public URL. EJS admin gets a small reusable upload-or-paste-URL widget partial used by both tag form (`fallback_image_url`) and place form (`photo_url`). Local dev writes to `public/uploads/`, served by Express static. Prod writes to `s3://eastvillageeverything-uploads/public/` — bucket policy allows public read on the `public/` prefix only.

Mobile reads URLs from the DB through the API (no change). The opaque-vs-resolved-URL question is sidestepped: we store full canonical URLs in the DB, both local and S3 paths.

## Tech Stack

- `flydrive` v2 (`drivers/fs` + `drivers/s3`) for storage abstraction
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (Flydrive peer deps, transitively used)
- `multer` for multipart parsing in Express
- Existing: Express, EJS, Bootstrap 5
- Existing test stack: Playwright e2e

## Working Agreements

- **Each task ends with `npm run typecheck` passing**.
- **Each task ends with a commit.** Conventional commit messages.
- **No claiming "done" without verifying.** Per `superpowers:verification-before-completion`.
- **GATE checkpoints** marked `**GATE**` — pause for user input.
- **Plan stays current** — `- [in-progress]` when started, `- [x]` when done, inline notes for divergences.
- **NO prod deploy** by automation. The user previews and ships themselves.

## Status Legend

- `- [ ]` not started · `- [in-progress]` mid-work · `- [x]` done · `- [BLOCKED: <reason>]` paused

---

## Current state (2026-05-06) — read this first

- Phase A landed on branch `phase-a-data-model`, pushed to GitHub, NOT merged to main, NOT deployed. Editor previewed locally, regression passed.
- Phase B starts on a NEW branch `phase-b-image-uploads`, branched off `phase-a-data-model` (NOT main — Phase B depends on Phase A's columns).
- Bucket `eastvillageeverything-uploads` exists in `us-east-1`, all public access blocked, versioned. NO bucket policy yet. NO IAM user yet.
- AWS CLI is authenticated as account root user (Arn `arn:aws:iam::324480210257:root`). For prod, the app must use a scoped IAM user, not root creds. This plan documents that setup but DOES NOT auto-create IAM resources — user runs those AWS commands themselves at the prod gate.
- Dev DB on local docker has the test admin (`e2e-test@eve.local` / `e2etest1234`) seeded from Phase A. Reuse for e2e auth.

---

## File Map

**Created**
- `src/storage/index.ts` — singleton `disk` (flydrive Disk instance), driver picked by env
- `src/storage/types.ts` — small shared interface for upload result
- `src/middleware/upload.ts` — multer instance with size + mime restrictions
- `src/views/admin/partials/upload-widget.ejs` — reusable upload-or-paste-URL widget
- `public/uploads/.gitkeep` — keep the local-uploads directory in git (file contents empty)
- `tests/e2e/admin/redesign-upload-endpoint.spec.ts` — e2e test for upload endpoint
- `tests/unit/storage.test.ts` — unit test for storage adapter behavior (uses tmpdir for FS driver)
- `docs/aws-setup.md` — IAM user + bucket policy AWS CLI commands the user runs before prod

**Modified**
- `package.json` — add `flydrive`, `multer`, `@types/multer` (devDep)
- `package-lock.json` — lockfile churn
- `.env.example` — document new env vars
- `.gitignore` — add `public/uploads/*` (but keep `.gitkeep`)
- `src/server.ts` — express.static for `/uploads/*` in dev only
- `src/routes/admin.ts` — add `POST /admin/uploads` handler
- `src/views/admin/tags/form.ejs` — replace `fallback_image_url` text input with upload widget include
- `src/views/admin/places/form.ejs` — add upload widget for `photo_url`
- `apps/mobile/eas.json` — no change, here for reference (no Phase B mobile work)

**Not touched in Phase B** (saved for later phases)
- Mobile UI: no changes. Mobile reads whatever URL is stored, period.
- Next.js admin: Phase C concern. The widget partial Phase B writes will be ported / replaced then.
- CloudFront: deferred. Direct S3 URLs work for now.

---

## Task List

### Task 1 — Setup: branch off Phase A

**Files:** none (setup only)

- [ ] **Step 1: Create the feature branch off `phase-a-data-model`**

```bash
git checkout phase-a-data-model
git checkout -b phase-b-image-uploads
```

The branch chains off Phase A because Phase B's UI changes (upload widget on tag and place forms) depend on Phase A's `fallback_image_url` and `primary_tag_id` fields existing on the form. When Phase A merges to main, Phase B will be rebased onto main as part of that flow.

- [ ] **Step 2: Confirm dev stack is up**

```bash
docker compose ps
```
Expected: `app`, `postgres`, `redis` all running. If not, `npm run docker:dev`.

- [ ] **Step 3: Verify Phase A migrations applied**

```bash
docker compose exec -T postgres psql -U eve -d eve_development -c "\d tags" | grep is_primary
```
Expected: `is_primary boolean NOT NULL`. If empty, run `npm run migrate` to bring DB up to date.

---

### Task 2 — Install dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install flydrive and multer**

```bash
npm install flydrive multer
npm install --save-dev @types/multer
```

Expected: `flydrive` lands at v2.1.x, `multer` at v1.4.x or v2.0.x, `@types/multer` matches.

- [ ] **Step 2: Verify versions**

```bash
node -e "console.log('flydrive', require('flydrive/package.json').version); console.log('multer', require('multer/package.json').version);"
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add flydrive + multer for image uploads"
```

---

### Task 3 — Document env vars in `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Append storage env vars**

Open `.env.example` and append (after the existing entries):

```
# Storage backend for image uploads — 'local' (default, writes to public/uploads/) or 's3'
STORAGE_BACKEND=local

# Absolute or relative path for the local FS driver. Used only when STORAGE_BACKEND=local.
STORAGE_LOCAL_DIR=public/uploads

# Public URL prefix returned by the local FS driver. Express serves public/ statically.
STORAGE_LOCAL_URL_PREFIX=/uploads

# AWS settings for the s3 driver. Used only when STORAGE_BACKEND=s3.
STORAGE_S3_BUCKET=eastvillageeverything-uploads
STORAGE_S3_REGION=us-east-1
STORAGE_S3_PREFIX=public
# Public-readable URL pattern. {key} is replaced with the object key (without prefix).
STORAGE_S3_URL_PATTERN=https://eastvillageeverything-uploads.s3.us-east-1.amazonaws.com/{key}
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: document image-upload env vars"
```

---

### Task 4 — Storage adapter singleton

**Files:**
- Create: `src/storage/types.ts`
- Create: `src/storage/index.ts`
- Test: `tests/unit/storage.test.ts`

- [ ] **Step 1: Create the unit test FIRST** (TDD)

Create `tests/unit/storage.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

// Re-import in each test by rebuilding the module — env-driven config
async function loadStorage(env: Record<string, string>) {
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  // Bust the require cache so the singleton picks up new env
  delete require.cache[require.resolve('../../src/storage/index')];
  return require('../../src/storage/index') as typeof import('../../src/storage/index');
}

describe('storage adapter (FS driver)', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('writes a buffer and reports the public URL', async () => {
    const { putObject } = await loadStorage({
      STORAGE_BACKEND: 'local',
      STORAGE_LOCAL_DIR: tmpDir,
      STORAGE_LOCAL_URL_PREFIX: '/uploads',
    });

    const result = await putObject(Buffer.from('hello'), {
      key: 'tag/test.txt',
      contentType: 'text/plain',
    });

    expect(result.url).toBe('/uploads/tag/test.txt');
    expect(result.key).toBe('tag/test.txt');

    const written = await fs.readFile(path.join(tmpDir, 'tag/test.txt'), 'utf8');
    expect(written).toBe('hello');
  });

  it('throws if STORAGE_BACKEND is unknown', async () => {
    delete require.cache[require.resolve('../../src/storage/index')];
    process.env.STORAGE_BACKEND = 'mysql';
    expect(() => require('../../src/storage/index')).toThrow(/STORAGE_BACKEND/);
  });
});
```

Note: this test uses Jest, but the server doesn't currently have a Jest config (Phase 1 plan noted this — server uses Playwright for e2e). For this Phase, add a minimal `jest.config.cjs` at repo root if one doesn't exist, OR run the test as a Playwright test using `test.describe` + `expect`. Pick whichever matches the existing pattern after running `ls jest.config.* tests/unit/ 2>&1`. If neither exists, default to creating a minimal `jest.config.cjs`:

```js
// jest.config.cjs (repo root, only if no existing jest config)
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
```

Add `ts-jest` and `@types/jest` to devDependencies if not present:
```bash
npm install --save-dev jest ts-jest @types/jest
```

Add to `package.json` scripts: `"test:unit": "jest"`.

- [ ] **Step 2: Run the test — confirm it fails**

```bash
npm run test:unit
```
Expected: FAIL with "Cannot find module '../../src/storage/index'".

- [ ] **Step 3: Create `src/storage/types.ts`**

```typescript
/** Shared types for the storage layer. */

export interface PutObjectOptions {
  /** Key (path under the storage root) — must NOT start with a slash. */
  key: string;
  /** MIME type of the object (e.g. 'image/jpeg'). */
  contentType: string;
}

export interface PutObjectResult {
  /** Public URL the browser can fetch — local: `/uploads/...`, S3: full https URL. */
  url: string;
  /** The key the object was stored under. */
  key: string;
}
```

- [ ] **Step 4: Create `src/storage/index.ts`**

```typescript
import { Disk } from 'flydrive';
import { FSDriver } from 'flydrive/drivers/fs';
import { S3Driver } from 'flydrive/drivers/s3';
import { S3Client } from '@aws-sdk/client-s3';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { PutObjectOptions, PutObjectResult } from './types.js';

export type { PutObjectOptions, PutObjectResult } from './types.js';

const backend = process.env.STORAGE_BACKEND ?? 'local';

let disk: Disk;
let urlFor: (key: string) => string;

if (backend === 'local') {
  const localDir = path.resolve(process.env.STORAGE_LOCAL_DIR ?? 'public/uploads');
  const urlPrefix = (process.env.STORAGE_LOCAL_URL_PREFIX ?? '/uploads').replace(/\/+$/, '');

  disk = new Disk(
    new FSDriver({
      location: localDir,
      visibility: 'public',
      urlBuilder: {
        async generateURL(key) {
          return `${urlPrefix}/${key}`;
        },
      },
    })
  );

  urlFor = (key) => `${urlPrefix}/${key}`;
} else if (backend === 's3') {
  const bucket = process.env.STORAGE_S3_BUCKET;
  const region = process.env.STORAGE_S3_REGION ?? 'us-east-1';
  const prefix = (process.env.STORAGE_S3_PREFIX ?? '').replace(/^\/+|\/+$/g, '');
  const urlPattern =
    process.env.STORAGE_S3_URL_PATTERN ??
    `https://${bucket}.s3.${region}.amazonaws.com/{key}`;

  if (!bucket) throw new Error('STORAGE_S3_BUCKET is required when STORAGE_BACKEND=s3');

  const client = new S3Client({ region });
  disk = new Disk(
    new S3Driver({
      client,
      bucket,
      visibility: 'public',
      urlBuilder: {
        async generateURL(key) {
          return urlPattern.replace('{key}', key);
        },
      },
    })
  );

  urlFor = (key) => urlPattern.replace('{key}', prefix ? `${prefix}/${key}` : key);
} else {
  throw new Error(
    `STORAGE_BACKEND must be 'local' or 's3' (got '${backend}'). Check your .env.`
  );
}

const s3KeyPrefix = backend === 's3' ? (process.env.STORAGE_S3_PREFIX ?? '').replace(/^\/+|\/+$/g, '') : '';

/**
 * Write a buffer to storage. Returns a public URL the browser can fetch.
 *
 * `key` is the relative path under the storage root (e.g. `tag/abc.jpg`).
 * For S3, the configured `STORAGE_S3_PREFIX` is prepended automatically.
 */
export async function putObject(
  body: Buffer,
  options: PutObjectOptions
): Promise<PutObjectResult> {
  const { key, contentType } = options;
  if (key.startsWith('/')) {
    throw new Error(`Storage key must not start with '/' (got '${key}')`);
  }

  const fullKey = backend === 's3' && s3KeyPrefix ? `${s3KeyPrefix}/${key}` : key;

  // FS driver auto-creates parent dirs in modern flydrive; assert anyway for safety.
  if (backend === 'local') {
    const localDir = path.resolve(process.env.STORAGE_LOCAL_DIR ?? 'public/uploads');
    await fs.mkdir(path.dirname(path.join(localDir, key)), { recursive: true });
  }

  await disk.put(fullKey, body, { contentType, visibility: 'public' });

  return {
    url: urlFor(key),
    key,
  };
}

export { disk };
```

- [ ] **Step 5: Run the unit test — confirm it passes**

```bash
npm run test:unit
```
Expected: 2 / 2 PASS.

- [ ] **Step 6: Run the typecheck**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/storage/ tests/unit/storage.test.ts jest.config.cjs package.json package-lock.json
git commit -m "feat(storage): flydrive-backed adapter with FS (local) and S3 drivers"
```

---

### Task 5 — Express static for local uploads

**Files:**
- Modify: `src/server.ts`
- Create: `public/uploads/.gitkeep`
- Modify: `.gitignore`

- [ ] **Step 1: Create the directory and gitkeep**

```bash
mkdir -p public/uploads
touch public/uploads/.gitkeep
```

- [ ] **Step 2: Update `.gitignore`**

Append to `.gitignore`:

```
# Local image uploads — keep the directory but ignore contents
public/uploads/*
!public/uploads/.gitkeep
```

- [ ] **Step 3: Add Express static middleware for `/uploads`**

Open `src/server.ts`. Find where `express.static('public')` is mounted (or where `public/` is served). The current pattern likely exists. If it does, this task is a no-op for the server file because `public/uploads` is already served as part of `public/`.

If `public/` is NOT mounted as a static directory (or only specific subdirs are), explicitly add:

```typescript
import express from 'express';
import path from 'node:path';
// ...existing imports

// (place near where other static middleware is set up)
app.use('/uploads', express.static(path.resolve('public/uploads'), {
  maxAge: '1d',
  fallthrough: false,
}));
```

If the existing static mount already covers `public/`, just verify with the curl in Step 5 below. Don't double-mount.

- [ ] **Step 4: Smoke test the static path**

Drop a tiny test file:

```bash
echo "phase b test" > public/uploads/_test.txt
```

Restart the dev server if needed (tsx should auto-reload).

```bash
curl -sS http://localhost:3000/uploads/_test.txt
```
Expected: `phase b test`

Clean up:
```bash
rm public/uploads/_test.txt
```

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/server.ts public/uploads/.gitkeep .gitignore
git commit -m "feat(server): serve /uploads/* as static for local storage backend"
```

---

### Task 6 — Multer middleware

**Files:**
- Create: `src/middleware/upload.ts`

- [ ] **Step 1: Create the multer instance**

```typescript
import multer from 'multer';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error(`Unsupported MIME type: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
}).single('file');

export { MAX_UPLOAD_BYTES, ALLOWED_MIME };
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/middleware/upload.ts
git commit -m "feat(middleware): multer config for single-file image upload (10MB cap)"
```

---

### Task 7 — Upload endpoint

**Files:**
- Modify: `src/routes/admin.ts`

- [ ] **Step 1: Add the upload route to the admin router**

In `src/routes/admin.ts`, add at the top with the other imports:

```typescript
import { randomUUID } from 'node:crypto';
import { uploadSingle, ALLOWED_MIME } from '../middleware/upload.js';
import { putObject } from '../storage/index.js';
```

Then add a new POST handler. Place it near the other admin POST handlers (after the place handlers, before the export). It MUST require auth (use the existing `requireAuth` middleware that protects other admin routes — match the file's pattern).

```typescript
/**
 * POST /admin/uploads
 *
 * Multipart form-data with a single field `file`. Auth: existing admin session.
 *
 * Optional form field `prefix` selects a logical bucket within storage
 * (e.g. 'tag', 'place'). Defaults to 'misc'. The actual filename is
 * randomized; client never controls the stored name.
 *
 * Response: 200 JSON { url, key }.
 */
router.post('/uploads', requireAuth, (req, res) => {
  uploadSingle(req, res, async (err) => {
    if (err) {
      const status = err.message?.startsWith('Unsupported MIME type') ? 415 :
                     err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: err.message ?? 'Upload failed' });
    }

    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded under field "file"' });
    }

    const prefixRaw = typeof req.body.prefix === 'string' ? req.body.prefix : 'misc';
    const prefix = prefixRaw.replace(/[^a-z0-9_-]/gi, '').toLowerCase().slice(0, 16) || 'misc';

    const ext = file.originalname.includes('.')
      ? file.originalname.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
      : (file.mimetype.split('/')[1] ?? 'bin');

    const key = `${prefix}/${randomUUID()}.${ext}`;

    try {
      const result = await putObject(file.buffer, {
        key,
        contentType: file.mimetype,
      });
      return res.json(result);
    } catch (writeErr: unknown) {
      console.error('upload: storage write failed', writeErr);
      return res.status(500).json({ error: 'Storage write failed' });
    }
  });
});
```

If `requireAuth` is imported under a different name in this file (e.g. `requireSession`, `adminAuth`), use that name. Match the existing pattern. If admin routes are auto-protected by router-level middleware, no per-route auth is needed — confirm by checking how other POST handlers like `/places` handle auth.

- [ ] **Step 2: Manual smoke-test**

With dev server running, log in to the admin UI in a browser (so you have a session cookie). Then in DevTools or via curl with the cookie:

```bash
# In browser DevTools console (with the admin session active):
const fd = new FormData();
fd.append('file', new Blob(['fake'], { type: 'image/png' }), 'test.png');
fd.append('prefix', 'tag');
const r = await fetch('/admin/uploads', { method: 'POST', body: fd, credentials: 'same-origin' });
console.log(r.status, await r.json());
```

Expected: `200 { url: '/uploads/tag/<uuid>.png', key: 'tag/<uuid>.png' }`. Confirm via:

```bash
curl -sS http://localhost:3000<URL_FROM_RESPONSE>
```
Expected: `fake`

Clean up the test file:
```bash
ls public/uploads/tag/ && rm public/uploads/tag/*
```

- [ ] **Step 3: Typecheck and commit**

```bash
npm run typecheck
git add src/routes/admin.ts
git commit -m "feat(admin): POST /admin/uploads accepts multipart image and stores via flydrive"
```

---

### Task 8 — Reusable upload widget partial

**Files:**
- Create: `src/views/admin/partials/upload-widget.ejs`

- [ ] **Step 1: Create the partial**

```html
<%
/*
 * Reusable image upload widget for the EJS admin.
 *
 * Locals required:
 *   - id        — unique HTML id base (used for inputs and aria) — e.g. 'fallback_image_url'
 *   - name      — form input name — e.g. 'fallback_image_url'
 *   - value     — current URL value (string) or null/undefined
 *   - prefix    — server-side storage prefix — e.g. 'tag' or 'place'
 *   - label     — visible label text — e.g. 'Fallback image'
 *   - help      — help text under the field (optional)
 *
 * Renders a drag-or-click drop zone, an inline preview, and a sibling URL text input.
 * On successful upload, the URL input is populated and the preview updates.
 * On error, a red message appears under the drop zone.
 */
const widgetId = id;
const widgetName = name;
const widgetValue = value || '';
const widgetPrefix = prefix || 'misc';
const widgetLabel = label;
const widgetHelp = help || '';
%>
<div class="mb-3 upload-widget" data-prefix="<%= widgetPrefix %>" data-target="<%= widgetId %>">
  <label for="<%= widgetId %>" class="form-label"><%= widgetLabel %></label>

  <div class="upload-dropzone p-3 mb-2 text-center"
       style="border: 2px dashed #ccc; border-radius: 8px; cursor: pointer; transition: border-color 0.15s;"
       role="button"
       tabindex="0"
       aria-label="Drop image or click to browse">
    <% if (widgetValue) { %>
      <img class="upload-preview" src="<%= widgetValue %>" alt="" style="max-height: 120px; max-width: 100%; border-radius: 4px;">
    <% } else { %>
      <div class="upload-preview-empty text-muted">Drop image here or click to browse (max 10MB, jpg/png/webp/gif)</div>
    <% } %>
    <input type="file" class="upload-file-input" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
  </div>

  <div class="upload-error text-danger small mb-2" role="alert" aria-live="polite" hidden></div>

  <input type="url" class="form-control upload-url-input" id="<%= widgetId %>" name="<%= widgetName %>"
         value="<%= widgetValue %>" placeholder="https://...">
  <% if (widgetHelp) { %>
    <div class="form-text"><%= widgetHelp %></div>
  <% } %>
</div>
```

- [ ] **Step 2: Add the JS handler** (at the bottom of the partial):

```html
<script>
(function () {
  // Idempotent — only attach handlers once even if the partial is included multiple times.
  if (window.__uploadWidgetWired) return;
  window.__uploadWidgetWired = true;

  document.querySelectorAll('.upload-widget').forEach((widget) => {
    const prefix = widget.dataset.prefix;
    const dropzone = widget.querySelector('.upload-dropzone');
    const fileInput = widget.querySelector('.upload-file-input');
    const urlInput = widget.querySelector('.upload-url-input');
    const errorEl = widget.querySelector('.upload-error');

    const showError = (msg) => {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    };
    const clearError = () => {
      errorEl.textContent = '';
      errorEl.hidden = true;
    };

    const renderPreview = (url) => {
      // Replace existing preview/empty with an image
      const existing = dropzone.querySelector('.upload-preview, .upload-preview-empty');
      if (existing) existing.remove();
      const img = document.createElement('img');
      img.className = 'upload-preview';
      img.src = url;
      img.alt = '';
      img.style.maxHeight = '120px';
      img.style.maxWidth = '100%';
      img.style.borderRadius = '4px';
      dropzone.insertBefore(img, fileInput);
    };

    const upload = async (file) => {
      clearError();
      if (file.size > 10 * 1024 * 1024) {
        showError('File too large (max 10MB).');
        return;
      }
      const fd = new FormData();
      fd.append('file', file);
      fd.append('prefix', prefix);
      try {
        const r = await fetch('/admin/uploads', {
          method: 'POST',
          body: fd,
          credentials: 'same-origin',
        });
        if (!r.ok) {
          const body = await r.json().catch(() => ({ error: 'Upload failed' }));
          showError(body.error || `Upload failed (${r.status})`);
          return;
        }
        const { url } = await r.json();
        urlInput.value = url;
        renderPreview(url);
      } catch (err) {
        showError(`Upload failed: ${err.message ?? err}`);
      }
    };

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files?.[0]) upload(fileInput.files[0]);
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#0d6efd';
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = '#ccc';
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#ccc';
      const file = e.dataTransfer?.files?.[0];
      if (file) upload(file);
    });

    // Live-update the preview if the user types a URL directly
    urlInput.addEventListener('change', () => {
      if (urlInput.value) renderPreview(urlInput.value);
    });
  });
})();
</script>
```

- [ ] **Step 3: Verify EJS compiles**

```bash
node -e "require('ejs').compile(require('fs').readFileSync('src/views/admin/partials/upload-widget.ejs', 'utf8'))" && echo OK
```

- [ ] **Step 4: Commit**

```bash
git add src/views/admin/partials/upload-widget.ejs
git commit -m "feat(admin-ui): reusable upload-widget partial (drop/click + URL input)"
```

---

### Task 9 — Wire widget into tag form

**Files:**
- Modify: `src/views/admin/tags/form.ejs`

- [ ] **Step 1: Replace the `fallback_image_url` text input with the widget**

In `src/views/admin/tags/form.ejs`, find the existing block that renders `fallback_image_url` (a `<div class="mb-3">` containing a label and `<input type="url">`). Replace that entire block with:

```html
<%- include('../partials/upload-widget', {
  id: 'fallback_image_url',
  name: 'fallback_image_url',
  value: tag && tag.fallback_image_url ? tag.fallback_image_url : '',
  prefix: 'tag',
  label: 'Fallback image',
  help: 'Shown when a place with this primary tag has no photo. Drop an image, click to browse, or paste a URL.',
}) %>
```

- [ ] **Step 2: Verify EJS compiles**

```bash
node -e "require('ejs').compile(require('fs').readFileSync('src/views/admin/tags/form.ejs', 'utf8'))" && echo OK
```

- [ ] **Step 3: Manual smoke test in browser**

1. Open `http://admin.localhost:3000/admin/tags/new` (or wherever).
2. Drop a small image into the Fallback image dropzone.
3. Confirm the URL input populates with `/uploads/tag/<uuid>.<ext>`.
4. Save the tag.
5. Edit it again — preview should render from the saved URL.
6. Test paste: clear the URL, paste any image URL, confirm preview updates.

- [ ] **Step 4: Commit**

```bash
git add src/views/admin/tags/form.ejs
git commit -m "feat(admin-ui): tag form uses upload-widget for fallback_image_url"
```

---

### Task 10 — Wire widget into place form

**Files:**
- Modify: `src/views/admin/places/form.ejs`

- [ ] **Step 1: Add a photo upload widget**

In `src/views/admin/places/form.ejs`, find the existing `photo_url` field if one exists, OR find the editorial section / a sensible spot (after Identity, before tags). Replace any existing `photo_url` text input with:

```html
<%- include('../partials/upload-widget', {
  id: 'photo_url',
  name: 'photo_url',
  value: place && place.photo_url ? place.photo_url : '',
  prefix: 'place',
  label: 'Photo',
  help: 'The hero image for this place. Drop an image, click to browse, or paste a CDN URL.',
}) %>
```

If `photo_url` is currently NOT in the place form (the form may currently only render editorial fields without photo), add this widget as a NEW field in a sensible spot — probably between Identity and Editorial sections. Don't remove existing fields.

- [ ] **Step 2: Verify EJS compiles**

```bash
node -e "require('ejs').compile(require('fs').readFileSync('src/views/admin/places/form.ejs', 'utf8'))" && echo OK
```

- [ ] **Step 3: Confirm `photo_url` admin handler accepts the value**

In `src/routes/admin.ts`, find the place create and update handlers. Confirm both already destructure `photo_url` from `req.body` and pass it to the model (Phase A's editorial-fields work would have done this; verify). If missing, add `photo_url: req.body.photo_url || null` to both handler calls.

- [ ] **Step 4: Manual smoke test**

1. Edit a place at `http://admin.localhost:3000/admin/places/<id>/edit`.
2. Drop an image into the Photo dropzone. Confirm URL populates.
3. Save. Edit again — preview renders from saved URL.
4. Confirm `/api/places/<id>` returns the new `photo_url`.

- [ ] **Step 5: Commit**

```bash
git add src/views/admin/places/form.ejs src/routes/admin.ts
git commit -m "feat(admin-ui): place form uses upload-widget for photo_url"
```

---

### Task 11 — E2E test for upload endpoint

**Files:**
- Create: `tests/e2e/admin/redesign-upload-endpoint.spec.ts`

- [ ] **Step 1: Write the test**

```typescript
import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

const APP = process.env.APP_BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'e2e-test@eve.local';
const ADMIN_PASS = process.env.ADMIN_PASS ?? 'e2etest1234';

// 1x1 transparent PNG, base64-decoded at test time
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

test.describe('POST /admin/uploads', () => {
  test('rejects unauthenticated requests with 401', async ({ request }) => {
    const res = await request.post(`${APP}/admin/uploads`, {
      multipart: {
        file: { name: 'a.png', mimeType: 'image/png', buffer: TINY_PNG },
        prefix: 'tag',
      },
    });
    expect([401, 302]).toContain(res.status());
  });

  test('uploads a PNG and returns a fetchable URL', async ({ page, request }) => {
    // Login first
    await page.goto(`${APP}/admin/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/places/);

    // Use the page's request context so the session cookie is attached.
    const res = await page.request.post(`${APP}/admin/uploads`, {
      multipart: {
        file: { name: 'tiny.png', mimeType: 'image/png', buffer: TINY_PNG },
        prefix: 'tag',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('url');
    expect(body).toHaveProperty('key');
    expect(body.url).toMatch(/^\/uploads\/tag\/[a-f0-9-]+\.png$/);

    // The URL is fetchable
    const fetched = await request.get(`${APP}${body.url}`);
    expect(fetched.status()).toBe(200);
    const buf = Buffer.from(await fetched.body());
    expect(buf.length).toBe(TINY_PNG.length);

    // Cleanup: remove the uploaded file so dev DB / disk doesn't accumulate.
    // The key is `tag/<uuid>.png`. Path is public/uploads/<key>.
    try {
      await fs.unlink(path.resolve(`public/uploads/${body.key}`));
    } catch (err) {
      // Non-fatal; some test environments may run from different cwd
    }
  });

  test('rejects oversize files with 413', async ({ page }) => {
    await page.goto(`${APP}/admin/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/places/);

    const huge = Buffer.alloc(11 * 1024 * 1024); // 11 MB > 10 MB cap

    const res = await page.request.post(`${APP}/admin/uploads`, {
      multipart: {
        file: { name: 'huge.png', mimeType: 'image/png', buffer: huge },
        prefix: 'tag',
      },
    });
    expect(res.status()).toBe(413);
  });

  test('rejects non-image MIME types with 415', async ({ page }) => {
    await page.goto(`${APP}/admin/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/places/);

    const res = await page.request.post(`${APP}/admin/uploads`, {
      multipart: {
        file: { name: 'sneaky.txt', mimeType: 'text/plain', buffer: Buffer.from('nope') },
        prefix: 'tag',
      },
    });
    expect(res.status()).toBe(415);
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
cd /Users/amitgulati/Projects/eastvillageeverything
npx playwright test tests/e2e/admin/redesign-upload-endpoint.spec.ts --project=desktop-chrome
```
Expected: 4 / 4 PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/admin/redesign-upload-endpoint.spec.ts
git commit -m "test(admin): upload endpoint accepts auth/multipart and validates size+mime"
```

---

### Task 12 — Document AWS setup for prod

**Files:**
- Create: `docs/aws-setup.md`

- [ ] **Step 1: Write the AWS setup doc**

This document is the user's runbook for provisioning the IAM user and bucket policy when they're ready to flip prod from `local` to `s3`. The agent does NOT run these commands — that's the user's call.

```markdown
# AWS setup for image uploads (prod)

The dev environment uses the local FS storage backend (`STORAGE_BACKEND=local`).
Before flipping prod to `s3`, run the steps below from a shell with AWS CLI v2
authenticated to the EVE AWS account.

> **Why not just use the root user?** Root credentials should never end up
> in the app's environment. This doc creates a scoped IAM user with
> least-privilege access to the upload bucket only.

## 1. Create the IAM user

```bash
aws iam create-user --user-name eve-app-uploads
```

## 2. Attach an inline policy with least-privilege bucket access

Create `eve-app-uploads-policy.json` locally:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowObjectWriteAndDeleteUnderPublicPrefix",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::eastvillageeverything-uploads/public/*"
    },
    {
      "Sid": "AllowBucketLocationLookup",
      "Effect": "Allow",
      "Action": "s3:GetBucketLocation",
      "Resource": "arn:aws:s3:::eastvillageeverything-uploads"
    }
  ]
}
```

```bash
aws iam put-user-policy \
  --user-name eve-app-uploads \
  --policy-name eve-uploads-rw \
  --policy-document file://eve-app-uploads-policy.json
```

## 3. Generate access keys for the app

```bash
aws iam create-access-key --user-name eve-app-uploads
```

Capture `AccessKeyId` and `SecretAccessKey`. Store in the prod environment's
`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` env vars (or attach to the
EC2 instance role if running on EC2 — preferred over static keys).

## 4. Open public read on the `public/` prefix

By default the bucket created in Phase B has all public-access blocks ON.
For images to be reachable directly from the mobile app, relax `BlockPublicPolicy`
and `RestrictPublicBuckets`, then attach a bucket policy that allows public
GetObject ONLY on the `public/` prefix.

```bash
aws s3api put-public-access-block \
  --bucket eastvillageeverything-uploads \
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": false,
    "RestrictPublicBuckets": false
  }'
```

Create `bucket-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadOnPublicPrefix",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::eastvillageeverything-uploads/public/*"
    }
  ]
}
```

```bash
aws s3api put-bucket-policy \
  --bucket eastvillageeverything-uploads \
  --policy file://bucket-policy.json
```

## 5. Set CORS so the admin browser can upload directly (only required if you migrate to presigned PUTs later)

Phase B uses server-proxied uploads so CORS is not strictly needed today.
Skip unless you adopt direct browser → S3 uploads.

## 6. Set the prod env vars

In the production environment (or `.env.production`):

```
STORAGE_BACKEND=s3
STORAGE_S3_BUCKET=eastvillageeverything-uploads
STORAGE_S3_REGION=us-east-1
STORAGE_S3_PREFIX=public
STORAGE_S3_URL_PATTERN=https://eastvillageeverything-uploads.s3.us-east-1.amazonaws.com/{key}
AWS_ACCESS_KEY_ID=<from step 3>
AWS_SECRET_ACCESS_KEY=<from step 3>
```

If running on EC2 with an instance role, omit the access key envs — the SDK
picks up role credentials automatically.

## 7. Test from prod

After deploy, log in as admin on prod and upload a test image. Confirm:
- The upload returns a 200 with a `url` like `https://eastvillageeverything-uploads.s3.us-east-1.amazonaws.com/public/tag/<uuid>.<ext>`.
- That URL is fetchable in an unauthenticated browser tab (public read working).
- The URL persists across server restarts.

## 8. Optional hardening (not Phase B scope)

- CloudFront in front of the bucket with Origin Access Control — improves
  cache, gives a shorter/branded URL, allows blocking direct S3 access.
- Image resizing / optimization at upload time — sharp + multiple variants.
- Antivirus scan via Lambda S3 trigger.
```

- [ ] **Step 2: Commit**

```bash
git add docs/aws-setup.md
git commit -m "docs: AWS IAM + bucket policy runbook for prod image uploads"
```

---

### Task 13 — Verify no regressions

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
cd /Users/amitgulati/Projects/eastvillageeverything
npm run typecheck
```
Expected: PASS.

- [ ] **Step 2: Mobile Jest**

```bash
cd /Users/amitgulati/Projects/eastvillageeverything/apps/mobile
npm test -- --watchAll=false
```
Expected: 181 pass + 1 skip (same baseline as Phase A).

- [ ] **Step 3: Server unit tests**

```bash
cd /Users/amitgulati/Projects/eastvillageeverything
npm run test:unit
```
Expected: 2 / 2 PASS (storage adapter tests from Task 4).

- [ ] **Step 4: All API + admin e2e on chromium**

```bash
cd /Users/amitgulati/Projects/eastvillageeverything
npx playwright test tests/e2e/api/ tests/e2e/admin/ --project=desktop-chrome
```
Expected: every existing test still passes plus the new upload e2e (4 tests). Note the count — should be ~36 (32 from Phase A + 4 new) or similar.

- [ ] **Step 5: Manual smoke**

With dev server up, walk the editor flow:
1. Edit a tag → upload an image as fallback → save → verify it persists by editing again.
2. Edit a place → upload an image as photo → save → verify persistence + that `/api/places/<id>` returns the URL.
3. Visit the public site (`http://localhost:3000/`) — confirm the existing place list still renders. Phase B should not regress public.

- [ ] **Step 6: No commit if no test changes**

If pre-existing tests required adjustment (unlikely — Phase B is additive), commit. Otherwise skip.

---

### Task 14 — **HARD GATE**: Push branch, hand off (NO prod deploy)

**Files:** none (handoff only)

> Same hard gate as Phase A. Per user directive: "don't deploy to production, i need to preview the admin changes locally before you roll them out." No PR, no merge, no deploy by automation.

- [ ] **Step 1: Push the feature branch**

```bash
git push -u origin phase-b-image-uploads
```

- [ ] **Step 2: Final smoke test**

Walk the manual flow from Task 13 Step 5 one more time. Confirm the dev server is still up, uploads work, public site renders.

- [ ] **Step 3: Handoff summary to user**

Send a short report:
- Branch name + last commit SHA.
- Test pass counts (server unit, e2e, mobile Jest).
- Any deviations from the plan and why.
- Reminder that prod requires the AWS setup in `docs/aws-setup.md` BEFORE merging — flipping `STORAGE_BACKEND=s3` without the IAM user and bucket policy in place will fail at runtime.

- [ ] **Step 4: STOP**

Do not merge. Do not deploy. Do not modify CLAUDE.md's source-of-truth pointer until the user confirms.

---

## Done definition

Phase B is complete when:
- Editor can upload images from the EJS admin (tag form, place form) and they persist + render.
- The local FS backend works on dev.
- The S3 driver path is wired and unit-tested but NOT actively used in dev (pending user's IAM provisioning).
- All e2e + unit tests pass on chromium.
- `docs/aws-setup.md` documents the prod IAM and bucket-policy runbook.
- Branch `phase-b-image-uploads` is pushed to origin, NOT merged, NOT deployed.

## Next

Phase C (Next.js admin rebuild). Will reuse Phase B's `putObject` and the upload widget logic but ports the UI from EJS to React. Plan to be drafted after Phase B preview/approval.
