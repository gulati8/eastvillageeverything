import { Stack, useLocalSearchParams } from 'expo-router';
import { PlaceDetail } from '../../src/screens/PlaceDetail';

export default function PlaceDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PlaceDetail id={id} />
    </>
  );
}
