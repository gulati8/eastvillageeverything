import * as SecureStore from 'expo-secure-store';
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

  // iOS 26 throws NSException at the keychain layer when SecureStore is
  // called without an explicit keychainService. Under React Native's new
  // architecture, that exception escapes ObjCTurboModule::performVoidMethodInvocation
  // and aborts the process. See facebook/react-native#54859.
  it('passes keychainService matching the bundle id on every SecureStore call', async () => {
    const expected = { keychainService: 'com.eastvillageeverything.app' };

    await getOrCreateDeviceId(); // generates → setItemAsync
    await clearDeviceIdForTest(); // deleteItemAsync
    await getOrCreateDeviceId(); // first reads via getItemAsync (returns null), then setItemAsync

    const getMock = SecureStore.getItemAsync as jest.Mock;
    const setMock = SecureStore.setItemAsync as jest.Mock;
    const delMock = SecureStore.deleteItemAsync as jest.Mock;

    expect(getMock).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalled();
    expect(delMock).toHaveBeenCalled();

    for (const call of getMock.mock.calls) {
      expect(call[1]).toEqual(expected);
    }
    for (const call of setMock.mock.calls) {
      expect(call[2]).toEqual(expected);
    }
    for (const call of delMock.mock.calls) {
      expect(call[1]).toEqual(expected);
    }
  });
});
