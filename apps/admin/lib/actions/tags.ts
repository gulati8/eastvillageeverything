'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { TagModel } from '@eve/db';
import { requireAdminMutation, sanitizeAdminNextPath } from '../security';
import { setFlash } from '../flash';

export type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9-]+$/.test(value);
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let i = 2;
  while (await TagModel.findByValue(candidate)) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
}

function errorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Something went wrong. Try again.';
}

export async function createTag(formData: FormData) {
  await requireAdminMutation();
  const returnTo = sanitizeAdminNextPath(formData.get('return_to'), '/tags/new');
  const display = String(formData.get('display') ?? '').trim();
  const value = String(formData.get('value') ?? '').trim();
  if (!display) {
    await setFlash('error', 'Give the tag a display name before saving.');
    redirect(returnTo);
  }
  if (!value || !isValidSlug(value)) {
    await setFlash('error', 'Fix the slug: lowercase letters, numbers and hyphens only.');
    redirect(returnTo);
  }
  if (await TagModel.findByValue(value)) {
    await setFlash('error', `A tag with the slug “${value}” already exists. Choose another slug.`);
    redirect(returnTo);
  }
  await TagModel.create({ value, display, sort_order: 0 });
  revalidatePath('/tags');
  await setFlash('success', `${display} created`);
  redirect('/tags');
}

export async function updateTag(id: string, formData: FormData) {
  await requireAdminMutation();
  const returnTo = sanitizeAdminNextPath(formData.get('return_to'), `/tags/${id}/edit`);
  const display = String(formData.get('display') ?? '').trim();
  const value = String(formData.get('value') ?? '').trim();
  if (!display) {
    await setFlash('error', 'Give the tag a display name before saving.');
    redirect(returnTo);
  }
  if (!value || !isValidSlug(value)) {
    await setFlash('error', 'Fix the slug: lowercase letters, numbers and hyphens only.');
    redirect(returnTo);
  }
  const existing = await TagModel.findByValue(value);
  if (existing && existing.id !== id) {
    await setFlash('error', `A tag with the slug “${value}” already exists. Choose another slug.`);
    redirect(returnTo);
  }
  await TagModel.update(id, { display, value });
  revalidatePath('/tags');
  await setFlash('success', `${display} saved`);
  redirect('/tags');
}

export async function deleteTag(formData: FormData) {
  await requireAdminMutation();
  const id = String(formData.get('id') ?? '');
  const returnTo = sanitizeAdminNextPath(formData.get('return_to'), '/tags');
  if (!id) {
    await setFlash('error', 'Nothing to delete: the form did not say which tag.');
    redirect(returnTo);
  }
  const tag = await TagModel.findById(id);
  if (!tag) {
    await setFlash('error', 'That tag no longer exists.');
    redirect('/tags');
  }
  await TagModel.delete(id);
  revalidatePath('/tags');
  await setFlash('success', `${tag.display} deleted`);
  redirect('/tags');
}

export async function reorderTags(orderedIds: string[]): Promise<ActionResult> {
  await requireAdminMutation();
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await TagModel.update(orderedIds[i]!, { sort_order: i });
    }
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
  revalidatePath('/tags');
  return { ok: true };
}

export async function createTagInline(
  display: string,
): Promise<ActionResult<{ tag: { id: string; value: string; display: string } }>> {
  await requireAdminMutation();
  const trimmed = display.trim();
  if (!trimmed) return { ok: false, error: 'Type a tag name first.' };
  try {
    const value = await uniqueSlug(slugify(trimmed));
    const tag = await TagModel.create({ value, display: trimmed, sort_order: 9999 });
    revalidatePath('/tags');
    return { ok: true, tag: { id: tag.id, value: tag.value, display: tag.display } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
