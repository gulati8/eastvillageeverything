'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PlaceModel, TagModel } from '@eve/db';
import { requireAdminMutation, sanitizeAdminNextPath } from '../security';
import { setFlash } from '../flash';
import { readPlaceForm } from '../placeForm';

function readTagIds(formData: FormData): string[] {
  const raw = String(formData.get('tag_ids') ?? '[]');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

async function tagValuesForIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const allTags = await TagModel.findAll();
  return ids
    .map((id) => allTags.find((t) => t.id === id)?.value)
    .filter((v): v is string => Boolean(v));
}

export async function createPlace(formData: FormData) {
  await requireAdminMutation();
  const returnTo = sanitizeAdminNextPath(formData.get('return_to'), '/places/new');
  const f = readPlaceForm(formData);
  if (!f.name) {
    await setFlash('error', 'Give the place a name before saving.');
    redirect(returnTo);
  }
  const tags = await tagValuesForIds(readTagIds(formData));
  const place = await PlaceModel.create({ ...f, tags });
  revalidatePath('/places');
  // Land on the new place's edit page so photos can be added next.
  await setFlash('success', `${f.name} created`, 'Add photos below.');
  redirect(`/places/${place.id}/edit`);
}

export async function updatePlace(id: string, formData: FormData) {
  await requireAdminMutation();
  const returnTo = sanitizeAdminNextPath(formData.get('return_to'), `/places/${id}/edit`);
  const f = readPlaceForm(formData);
  if (!f.name) {
    await setFlash('error', 'Give the place a name before saving.');
    redirect(returnTo);
  }
  const tags = await tagValuesForIds(readTagIds(formData));
  await PlaceModel.update(id, { ...f, tags });
  revalidatePath('/places');
  revalidatePath(`/places/${id}/edit`);
  await setFlash('success', `${f.name} saved`);
  // Stay on the page being edited rather than bouncing to the list.
  redirect(`/places/${id}/edit`);
}

export async function deletePlace(formData: FormData) {
  await requireAdminMutation();
  const id = String(formData.get('id') ?? '');
  const returnTo = sanitizeAdminNextPath(formData.get('return_to'), '/places');
  if (!id) {
    await setFlash('error', 'Nothing to delete: the form did not say which place.');
    redirect(returnTo);
  }
  const place = await PlaceModel.findById(id);
  if (!place) {
    await setFlash('error', 'That place no longer exists.');
    redirect('/places');
  }
  await PlaceModel.delete(id);
  revalidatePath('/places');
  await setFlash('success', `${place.name} deleted`);
  redirect('/places');
}
