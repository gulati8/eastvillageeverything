'use server';

import { revalidatePath } from 'next/cache';
import { PlacePhotoModel } from '@eve/db';
import type { PlacePhotoResponse } from '@eve/shared-types';
import { requireAdminMutation } from '../security';
import { toPlacePhotoResponse } from '../photos';
import type { ActionResult } from './tags';

export type PhotosResult = ActionResult<{ photos: PlacePhotoResponse[] }>;

function errorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Something went wrong. Try again.';
}

/** The place's fresh ordered list after a write, with the list and edit pages revalidated. */
async function freshList(placeId: string): Promise<PhotosResult> {
  const photos = (await PlacePhotoModel.listForPlace(placeId)).map(toPlacePhotoResponse);
  revalidatePath('/places');
  revalidatePath(`/places/${placeId}/edit`);
  return { ok: true, photos };
}

export async function removePlacePhoto(photoId: string): Promise<PhotosResult> {
  await requireAdminMutation();
  try {
    const placeId = await PlacePhotoModel.remove(photoId);
    if (!placeId) return { ok: false, error: 'That photo was already removed.' };
    return await freshList(placeId);
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function makeFirstPlacePhoto(photoId: string): Promise<PhotosResult> {
  await requireAdminMutation();
  try {
    const moved = await PlacePhotoModel.makeFirst(photoId);
    if (!moved) return { ok: false, error: 'That photo no longer exists.' };
    return await freshList(moved.place_id);
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function setPlacePhotoCredit(photoId: string, credit: string): Promise<PhotosResult> {
  await requireAdminMutation();
  try {
    const row = await PlacePhotoModel.setCredit(photoId, credit);
    if (!row) return { ok: false, error: 'That photo no longer exists.' };
    return await freshList(row.place_id);
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
