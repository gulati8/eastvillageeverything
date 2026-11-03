'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { TagModel } from '@eve/db';
import { requireAdminMutation, sanitizeAdminNextPath } from '../security';
import { setFlash } from '../flash';
import { slugify, suffixSlug } from '../slug';

export type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

/**
 * First of `base`, `base-2`, `base-3`… that no other tag holds. A tag whose
 * id is `excludeId` does not count, so a tag keeps its slug on an unchanged
 * save and takes the plain slug back on rename.
 */
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  for (let i = 2; ; i++) {
    const existing = await TagModel.findByValue(candidate);
    if (!existing || existing.id === excludeId) return candidate;
    candidate = suffixSlug(base, i);
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Something went wrong. Try again.';
}

export async function createTag(formData: FormData) {
  await requireAdminMutation();
  const returnTo = sanitizeAdminNextPath(formData.get('return_to'), '/tags/new');
  const display = String(formData.get('display') ?? '').trim();
  if (!display) {
    await setFlash('error', 'Give the tag a display name before saving.');
    redirect(returnTo);
  }
  const value = await uniqueSlug(slugify(display));
  await TagModel.create({ value, display, sort_order: 0 });
  revalidatePath('/tags');
  await setFlash('success', `${display} created`);
  redirect('/tags');
}

export async function updateTag(id: string, formData: FormData) {
  await requireAdminMutation();
  const returnTo = sanitizeAdminNextPath(formData.get('return_to'), `/tags/${id}/edit`);
  const display = String(formData.get('display') ?? '').trim();
  if (!display) {
    await setFlash('error', 'Give the tag a display name before saving.');
    redirect(returnTo);
  }
  const value = await uniqueSlug(slugify(display), id);
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
