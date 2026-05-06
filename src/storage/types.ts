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
