import { useQuery } from '@tanstack/react-query';
import { tagsApi } from './client';
import type { TagsFlatResponse, TagsStructuredResponse } from '@eve/shared-types';

export function useTagsFlat() {
  return useQuery<TagsFlatResponse>({
    queryKey: ['tags'],
    queryFn: () => tagsApi.flat(),
  });
}

export function useTagsStructured() {
  return useQuery<TagsStructuredResponse>({
    queryKey: ['tags', 'structured'],
    queryFn: () => tagsApi.structured(),
  });
}
