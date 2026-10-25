import { QueryObserver, type QueryClient } from '@tanstack/react-query';
import type { PlaceDetailResponse, PlaceResponse } from '@eve/shared-types';
import { createQueryClient } from '../state/queryClient';
import { placeQueryOptions } from './places';
import { placesApi } from './client';

jest.mock('./client', () => ({
  placesApi: { byId: jest.fn() },
}));

const listRow = {
  key: 'abc',
  name: '11th Street Bar',
  address: '510 E 11th St',
  pitch: 'A proper neighborhood Irish pub.',
  photo_url: 'https://example.test/photo?size=orig',
} as unknown as PlaceResponse;

const detail = {
  ...listRow,
  perfect: 'Match day.',
  insider: 'Sit at the back.',
  photo_attribution: '11th St. Bar',
} as unknown as PlaceDetailResponse;

describe('placeQueryOptions', () => {
  const clients: QueryClient[] = [];
  function makeClient(): QueryClient {
    const client = createQueryClient();
    clients.push(client);
    return client;
  }

  beforeEach(() => {
    (placesApi.byId as jest.Mock).mockReset();
  });

  afterEach(() => {
    // Drop the 24h gc timers so the jest worker can exit.
    for (const client of clients.splice(0)) client.clear();
  });

  it('seeds the detail from a cached list row', () => {
    const client = makeClient();
    client.setQueryData(['places'], [listRow]);

    const observer = new QueryObserver(client, client.defaultQueryOptions(placeQueryOptions(client, 'abc')));
    expect(observer.getCurrentResult().data).toEqual(listRow);
  });

  it('treats the list-row seed as stale and fetches the full detail immediately', async () => {
    const client = makeClient();
    client.setQueryData(['places'], [listRow]);
    (placesApi.byId as jest.Mock).mockResolvedValue(detail);

    const observer = new QueryObserver(client, client.defaultQueryOptions(placeQueryOptions(client, 'abc')));
    expect(observer.getCurrentResult().isStale).toBe(true);

    const settled = new Promise<PlaceDetailResponse>((resolve) => {
      const unsubscribe = observer.subscribe((result) => {
        const data = result.data as Partial<PlaceDetailResponse> | undefined;
        if (data?.photo_attribution) {
          unsubscribe();
          resolve(data as PlaceDetailResponse);
        }
      });
    });

    await expect(settled).resolves.toEqual(detail);
    expect(placesApi.byId).toHaveBeenCalledWith('abc');
  });

  it('does not refetch when a fresh full detail is already cached', () => {
    const client = makeClient();
    client.setQueryData(['places'], [listRow]);
    client.setQueryData(['place', 'abc'], detail);

    const observer = new QueryObserver(client, client.defaultQueryOptions(placeQueryOptions(client, 'abc')));
    const unsubscribe = observer.subscribe(() => {});
    unsubscribe();

    expect(observer.getCurrentResult().data).toEqual(detail);
    expect(observer.getCurrentResult().isStale).toBe(false);
    expect(placesApi.byId).not.toHaveBeenCalled();
  });

  it('is disabled with no seed when there is no id', () => {
    const client = makeClient();
    const options = placeQueryOptions(client, undefined);
    expect(options.enabled).toBe(false);
    expect(options.initialData()).toBeUndefined();
  });
});
