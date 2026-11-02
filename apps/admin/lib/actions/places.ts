'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PlaceModel, TagModel } from '@eve/db';
import { requireAdminMutation, sanitizeAdminNextPath } from '../security';
import { setFlash } from '../flash';

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

function readForm(formData: FormData) {
  return {
    name: String(formData.get('name') ?? '').trim(),
    address: String(formData.get('address') ?? '').trim() || undefined,
    cross_street: String(formData.get('cross_street') ?? '').trim() || undefined,
    phone: String(formData.get('phone') ?? '').trim() || undefined,
    url: String(formData.get('url') ?? '').trim() || undefined,
    neighborhood_id: String(formData.get('neighborhood_id') ?? '').trim() || undefined,
    // Photo fields are submitted as '' when cleared so the model nulls them;
    // the three must change together.
    photo_url: String(formData.get('photo_url') ?? '').trim(),
    photo_thumb_url: String(formData.get('photo_thumb_url') ?? '').trim(),
    photo_hero_url: String(formData.get('photo_hero_url') ?? '').trim(),
    photo_credit: String(formData.get('photo_credit') ?? '').trim() || undefined,
    specials: String(formData.get('specials') ?? '') || undefined,
    notes: String(formData.get('notes') ?? '') || undefined,
    pitch: String(formData.get('pitch') ?? '') || undefined,
    perfect: String(formData.get('perfect') ?? '') || undefined,
    insider: String(formData.get('insider') ?? '') || undefined,
    vibe: String(formData.get('vibe') ?? '') || undefined,
    crowd: String(formData.get('crowd') ?? '') || undefined,
  };
}

export async function createPlace(formData: FormData) {
  await requireAdminMutation();
  const returnTo = sanitizeAdminNextPath(formData.get('return_to'), '/places/new');
  const f = readForm(formData);
  if (!f.name) {
    await setFlash('error', 'Give the place a name before saving.');
    redirect(returnTo);
  }
  const tags = await tagValuesForIds(readTagIds(formData));
  await PlaceModel.create({ ...f, tags });
  revalidatePath('/places');
  await setFlash('success', `${f.name} created`);
  redirect('/places');
}

export async function updatePlace(id: string, formData: FormData) {
  await requireAdminMutation();
  const returnTo = sanitizeAdminNextPath(formData.get('return_to'), `/places/${id}/edit`);
  const f = readForm(formData);
  if (!f.name) {
    await setFlash('error', 'Give the place a name before saving.');
    redirect(returnTo);
  }
  const tags = await tagValuesForIds(readTagIds(formData));
  await PlaceModel.update(id, { ...f, tags });
  revalidatePath('/places');
  revalidatePath(`/places/${id}/edit`);
  await setFlash('success', `${f.name} saved`);
  redirect('/places');
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
