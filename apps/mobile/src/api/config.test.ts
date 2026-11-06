import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiBaseUrl } from './config';

// Node has no react-native; config.ts only needs Platform.OS.
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

const constants = Constants as unknown as { expoGoConfig?: { debuggerHost?: string } };
const platform = Platform as unknown as { OS: string };

describe('getApiBaseUrl', () => {
  const originalEnv = process.env.EXPO_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    constants.expoGoConfig = undefined;
    platform.OS = 'ios';
  });

  afterAll(() => {
    if (originalEnv === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = originalEnv;
  });

  it('uses EXPO_PUBLIC_API_BASE_URL when set, without a trailing slash', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://eastvillageeverything.nyc/';
    expect(getApiBaseUrl()).toBe('https://eastvillageeverything.nyc');
  });

  it('uses the Metro host in Expo Go', () => {
    constants.expoGoConfig = { debuggerHost: '192.168.1.20:8081' };
    expect(getApiBaseUrl()).toBe('http://192.168.1.20:3000');
  });

  it('falls back to localhost on the iOS Simulator', () => {
    expect(getApiBaseUrl()).toBe('http://localhost:3000');
  });

  it('falls back to 10.0.2.2 on the Android emulator', () => {
    platform.OS = 'android';
    expect(getApiBaseUrl()).toBe('http://10.0.2.2:3000');
  });
});
