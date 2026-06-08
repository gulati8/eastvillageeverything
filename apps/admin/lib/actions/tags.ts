'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { TagModel } from '@eve/db';
import { requireAdminMutation } from '../security';

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

export async function createTag(formData: FormData) {
  await requireAdminMutation();
  const display = String(formData.get('display') ?? '').trim();
  const value = String(formData.get('value') ?? '').trim();
  if (!display || !value || !isValidSlug(value)) return;
  if (await TagModel.findByValue(value)) return;
  await TagModel.create({ value, display, sort_order: 0 });
  revalidatePath('/tags');
  redirect('/tags');
}

export async function updateTag(id: string, formData: FormData) {
  await requireAdminMutation();
  const display = String(formData.get('display') ?? '').trim();
  const value = String(formData.get('value') ?? '').trim();
  if (!display || !value || !isValidSlug(value)) return;
  const existing = await TagModel.findByValue(value);
  if (existing && existing.id !== id) return;
  await TagModel.update(id, { display, value });
  revalidatePath('/tags');
  redirect('/tags');
}

export async function deleteTag(formData: FormData) {
  await requireAdminMutation();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await TagModel.delete(id);
  revalidatePath('/tags');
  redirect('/tags');
}

export async function reorderTags(orderedIds: string[]) {
  await requireAdminMutation();
  for (let i = 0; i < orderedIds.length; i++) {
    await TagModel.update(orderedIds[i]!, { sort_order: i });
  }
  revalidatePath('/tags');
}

export async function createTagInline(display: string): Promise<{ id: string; value: string; display: string } | null> {
  await requireAdminMutation();
  const trimmed = display.trim();
  if (!trimmed) return null;
  const value = await uniqueSlug(slugify(trimmed));
  const tag = await TagModel.create({ value, display: trimmed, sort_order: 9999 });
  revalidatePath('/tags');
  return { id: tag.id, value: tag.value, display: tag.display };
}
