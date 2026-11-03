'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { NeighborhoodModel } from '@eve/db';
import { requireAdminMutation, sanitizeAdminNextPath } from '../security';
import { setFlash } from '../flash';
import { slugify, suffixSlug } from '../slug';
import type { ActionResult } from './tags';

/**
 * First of `base`, `base-2`, `base-3`… that no other neighborhood holds. A
 * row whose id is `excludeId` does not count, so a neighborhood keeps its
 * slug on an unchanged save and takes the plain slug back on rename.
 */
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  for (let i = 2; ; i++) {
    const existing = await NeighborhoodModel.findByValue(candidate);
    if (!existing || existing.id === excludeId) return candidate;
    candidate = suffixSlug(base, i);
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Something went wrong. Try again.';
}

export async function createNeighborhood(formData: FormData) {
  await requireAdminMutation();
  const returnTo = sanitizeAdminNextPath(formData.get('return_to'), '/neighborhoods/new');
  const display = String(formData.get('display') ?? '').trim();
  const isDefault = formData.get('is_default') === 'on';
  if (!display) {
    await setFlash('error', 'Give the neighborhood a display name before saving.');
    redirect(returnTo);
  }
  const value = await uniqueSlug(slugify(display));
  await NeighborhoodModel.create({ value, display, is_default: isDefault });
  revalidatePath('/neighborhoods');
  await setFlash('success', `${display} created`);
  redirect('/neighborhoods');
}

export async function updateNeighborhood(id: string, formData: FormData) {
  await requireAdminMutation();
  const returnTo = sanitizeAdminNextPath(formData.get('return_to'), `/neighborhoods/${id}/edit`);
  const display = String(formData.get('display') ?? '').trim();
  const isDefault = formData.get('is_default') === 'on';
  if (!display) {
    await setFlash('error', 'Give the neighborhood a display name before saving.');
    redirect(returnTo);
  }
  const value = await uniqueSlug(slugify(display), id);
  await NeighborhoodModel.update(id, { display, value, is_default: isDefault });
  revalidatePath('/neighborhoods');
  await setFlash('success', `${display} saved`);
  redirect('/neighborhoods');
}

export async function deleteNeighborhood(formData: FormData) {
  await requireAdminMutation();
  const id = String(formData.get('id') ?? '');
  const returnTo = sanitizeAdminNextPath(formData.get('return_to'), '/neighborhoods');
  if (!id) {
    await setFlash('error', 'Nothing to delete: the form did not say which neighborhood.');
    redirect(returnTo);
  }
  const n = await NeighborhoodModel.findById(id);
  if (!n) {
    await setFlash('error', 'That neighborhood no longer exists.');
    redirect('/neighborhoods');
  }
  try {
    await NeighborhoodModel.delete(id);
  } catch (e) {
    // The model refuses to delete the default neighborhood or one with places.
    await setFlash('error', `Could not delete ${n.display}.`, errorMessage(e));
    redirect(returnTo);
  }
  revalidatePath('/neighborhoods');
  await setFlash('success', `${n.display} deleted`);
  redirect('/neighborhoods');
}

export async function createNeighborhoodInline(
  display: string,
): Promise<ActionResult<{ neighborhood: { id: string; value: string; display: string } }>> {
  await requireAdminMutation();
  const trimmed = display.trim();
  if (!trimmed) return { ok: false, error: 'Type a neighborhood name first.' };
  try {
    const value = await uniqueSlug(slugify(trimmed));
    const n = await NeighborhoodModel.create({ value, display: trimmed });
    revalidatePath('/neighborhoods');
    return { ok: true, neighborhood: { id: n.id, value: n.value, display: n.display } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
