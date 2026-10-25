import { useColorScheme } from 'react-native';
import { nativeTheme } from '../lib/native-theme';

export function useColors() {
  const scheme = useColorScheme();
  return nativeTheme[scheme === 'light' ? 'light' : 'dark'];
}
