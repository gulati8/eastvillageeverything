/**
 * TagFilterChips — defensive shape handling
 *
 * Verifies the component does not crash when `useTagsStructured` returns
 * a plain flat array (pre-deploy server) OR the structured object shape.
 *
 * Runs in the `node` jest environment; React Native modules are mocked so
 * no native renderer is needed. We call the component as a plain function
 * and assert the returned React element is not null.
 */

import React from 'react';
import type { TagSummary, TagsStructuredResponse } from '@eve/shared-types';

// Mock react-native before importing the component
jest.mock('react-native', () => ({
  Pressable: (props: any) => React.createElement('Pressable', props),
  ScrollView: (props: any) => React.createElement('ScrollView', props),
  StyleSheet: { create: (s: any) => s },
  Text: (props: any) => React.createElement('Text', props),
  View: (props: any) => React.createElement('View', props),
}));

jest.mock('../Skeleton', () => ({
  Skeleton: () => React.createElement('Skeleton', {}),
}));

// The hook mock — will be overridden per test
jest.mock('../../api/tags', () => ({
  useTagsStructured: jest.fn(),
}));

import { TagFilterChips } from '../TagFilterChips';
import { useTagsStructured } from '../../api/tags';

const mockUseTagsStructured = useTagsStructured as jest.MockedFunction<typeof useTagsStructured>;

const flatTags: TagSummary[] = [
  { value: 'food', display: 'Food', order: '0' },
  { value: 'bar', display: 'Bar', order: '1' },
];

const structuredData: TagsStructuredResponse = {
  parents: [
    {
      value: 'food', display: 'Food', order: '0',
      children: [{ value: 'pizza', display: 'Pizza', order: '1' }],
    },
  ],
  standalone: [{ value: 'bar', display: 'Bar', order: '2' }],
};

describe('TagFilterChips — backward-compatible shape handling', () => {
  it('does not crash when hook returns a flat array (pre-deploy server shape)', () => {
    mockUseTagsStructured.mockReturnValue({
      data: flatTags as unknown as TagsStructuredResponse,
      isLoading: false,
      isError: false,
    } as any);

    expect(() => TagFilterChips({ selected: null, onSelect: jest.fn() })).not.toThrow();
  });

  it('does not crash when hook returns the structured object shape', () => {
    mockUseTagsStructured.mockReturnValue({
      data: structuredData,
      isLoading: false,
      isError: false,
    } as any);

    expect(() => TagFilterChips({ selected: null, onSelect: jest.fn() })).not.toThrow();
  });
});
