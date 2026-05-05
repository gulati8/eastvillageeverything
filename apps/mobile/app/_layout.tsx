import { Stack } from 'expo-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { createQueryClient } from '../src/state/queryClient';
import { createPersister, getCacheBuster } from '../src/state/persister';
import { initSentry, Sentry } from '../src/observability/sentry';
import { ThemeProvider } from '../src/theme';
import { useFontsLoaded } from '../src/theme/useFontsLoaded';

// Initialize on module load — happens once per app cold-start.
initSentry();

// Keep splash screen visible until fonts are ready.
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const queryClient = useMemo(() => createQueryClient(), []);
  const persister = useMemo(() => createPersister(), []);
  const buster = useMemo(() => getCacheBuster(), []);

  const { fontsLoaded, fontError } = useFontsLoaded();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            buster,
            maxAge: 24 * 60 * 60 * 1000,
          }}
        >
          <Stack />
        </PersistQueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
