import { useColorScheme } from 'react-native';
import { nativeTheme } from '../lib/native-theme';

export function useColors(schemeOverride?: 'light' | 'dark') {
  const systemScheme = useColorScheme();
  const scheme =
    schemeOverride ?? (systemScheme === 'light' ? 'light' : 'dark');
  return nativeTheme[scheme];
}
