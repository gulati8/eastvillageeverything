import { Stack } from 'expo-router';
import { PlaceList } from '../src/screens/PlaceList';

export default function Index() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PlaceList />
    </>
  );
}
