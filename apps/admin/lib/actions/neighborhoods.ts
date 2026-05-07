'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { NeighborhoodModel } from '@eve/db';

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let i = 2;
  while (await NeighborhoodModel.findByValue(candidate)) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
}

export async function createNeighborhood(formData: FormData) {
  const display = String(formData.get('display') ?? '').trim();
  const valueRaw = String(formData.get('value') ?? '').trim();
  const isDefault = formData.get('is_default') === 'on';
  if (!display) return;
  const value = await uniqueSlug(valueRaw ? slugify(valueRaw) : slugify(display));
  await NeighborhoodModel.create({ value, display, is_default: isDefault });
  revalidatePath('/neighborhoods');
  redirect('/neighborhoods');
}

export async function updateNeighborhood(id: string, formData: FormData) {
  const display = String(formData.get('display') ?? '').trim();
  const value = String(formData.get('value') ?? '').trim();
  const isDefault = formData.get('is_default') === 'on';
  await NeighborhoodModel.update(id, { display, value, is_default: isDefault });
  revalidatePath('/neighborhoods');
  redirect('/neighborhoods');
}

export async function deleteNeighborhood(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await NeighborhoodModel.delete(id);
  revalidatePath('/neighborhoods');
  redirect('/neighborhoods');
}

export async function createNeighborhoodInline(display: string): Promise<{ id: string; value: string; display: string } | null> {
  const trimmed = display.trim();
  if (!trimmed) return null;
  const value = await uniqueSlug(slugify(trimmed));
  const n = await NeighborhoodModel.create({ value, display: trimmed });
  revalidatePath('/neighborhoods');
  return { id: n.id, value: n.value, display: n.display };
}
