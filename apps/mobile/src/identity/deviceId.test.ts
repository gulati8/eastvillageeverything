import { getOrCreateDeviceId, clearDeviceIdForTest } from './deviceId';

describe('getOrCreateDeviceId', () => {
  beforeEach(async () => {
    await clearDeviceIdForTest();
  });

  it('generates a UUID v4 on first call', async () => {
    const id = await getOrCreateDeviceId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('returns the same UUID on subsequent calls', async () => {
    const id1 = await getOrCreateDeviceId();
    const id2 = await getOrCreateDeviceId();
    expect(id1).toBe(id2);
  });
});
