import { useFonts as useInstrumentSerifFonts, InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { useFonts as useSourceSerif4Fonts, SourceSerif4_300Light, SourceSerif4_400Regular, SourceSerif4_400Regular_Italic, SourceSerif4_600SemiBold, SourceSerif4_700Bold, SourceSerif4_700Bold_Italic } from '@expo-google-fonts/source-serif-4';
import { useFonts as useSchibstedGroteskFonts, SchibstedGrotesk_400Regular, SchibstedGrotesk_500Medium, SchibstedGrotesk_600SemiBold, SchibstedGrotesk_700Bold, SchibstedGrotesk_900Black } from '@expo-google-fonts/schibsted-grotesk';
import { useFonts as useArchivoBlackFonts, ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';

export interface FontsLoadedResult {
  fontsLoaded: boolean;
  fontError: Error | null;
}

export function useFontsLoaded(): FontsLoadedResult {
  const [instrumentSerifLoaded, instrumentSerifError] = useInstrumentSerifFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });

  const [sourceSerif4Loaded, sourceSerif4Error] = useSourceSerif4Fonts({
    SourceSerif4_300Light,
    SourceSerif4_400Regular,
    SourceSerif4_400Regular_Italic,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
    SourceSerif4_700Bold_Italic,
  });

  const [schibstedGroteskLoaded, schibstedGroteskError] = useSchibstedGroteskFonts({
    SchibstedGrotesk_400Regular,
    SchibstedGrotesk_500Medium,
    SchibstedGrotesk_600SemiBold,
    SchibstedGrotesk_700Bold,
    SchibstedGrotesk_900Black,
  });

  const [archivoBlackLoaded, archivoBlackError] = useArchivoBlackFonts({
    ArchivoBlack_400Regular,
  });

  const fontsLoaded =
    instrumentSerifLoaded &&
    sourceSerif4Loaded &&
    schibstedGroteskLoaded &&
    archivoBlackLoaded;
  const fontError =
    instrumentSerifError ??
    sourceSerif4Error ??
    schibstedGroteskError ??
    archivoBlackError ??
    null;

  return { fontsLoaded, fontError };
}
