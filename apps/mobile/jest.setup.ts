// __DEV__ is a Metro/RN global not present in the Node jest environment.
// Define it so modules that guard with `if (__DEV__)` don't throw.
(global as any).__DEV__ = true;

const memoryStore: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(async (key: string) => memoryStore[key] ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { memoryStore[key] = value; }),
  deleteItemAsync: jest.fn(async (key: string) => { delete memoryStore[key]; }),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
}));

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      ScrollView: RN.ScrollView,
    },
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: (cb: () => any) => cb(),
    withTiming: (val: any) => val,
    withRepeat: (val: any) => val,
    withSequence: (...vals: any[]) => vals[vals.length - 1],
    runOnJS: (fn: any) => fn,
    Animated: {
      View: RN.View,
      Text: RN.Text,
      ScrollView: RN.ScrollView,
    },
  };
}, { virtual: true });

jest.mock('react-native-gesture-handler', () => {
  const RN = require('react-native');
  const makeChainable = (): any => {
    const obj: Record<string, any> = {};
    ['onStart', 'onUpdate', 'onEnd', 'onFinalize', 'onChange', 'enabled', 'minDistance', 'maxDuration'].forEach((k) => {
      obj[k] = () => obj;
    });
    return obj;
  };
  return {
    __esModule: true,
    GestureHandlerRootView: ({ children }: { children: any }) =>
      require('react').createElement(RN.View, null, children),
    Gesture: {
      Pan: () => makeChainable(),
      Tap: () => makeChainable(),
    },
  };
}, { virtual: true });

jest.mock('expo-haptics', () => ({
  __esModule: true,
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}), { virtual: true });

jest.mock('expo-blur', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    BlurView: ({ children }: { children: any }) =>
      require('react').createElement(RN.View, null, children),
  };
}, { virtual: true });

beforeEach(() => {
  for (const k of Object.keys(memoryStore)) delete memoryStore[k];
  jest.clearAllMocks();
});
