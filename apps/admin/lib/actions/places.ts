'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PlaceModel, TagModel } from '@eve/db';

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
    photo_url: String(formData.get('photo_url') ?? '').trim() || undefined,
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
  const f = readForm(formData);
  if (!f.name) return;
  const tags = await tagValuesForIds(readTagIds(formData));
  await PlaceModel.create({ ...f, tags });
  revalidatePath('/places');
  redirect('/places');
}

export async function updatePlace(id: string, formData: FormData) {
  const f = readForm(formData);
  const tags = await tagValuesForIds(readTagIds(formData));
  await PlaceModel.update(id, { ...f, tags });
  revalidatePath('/places');
  revalidatePath(`/places/${id}/edit`);
  redirect('/places');
}

export async function deletePlace(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await PlaceModel.delete(id);
  revalidatePath('/places');
  redirect('/places');
}
