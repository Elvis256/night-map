import { tokens } from '../generated/tokens';

function toPixels(value: string) {
  const amount = Number.parseFloat(value);
  return value.endsWith('rem') ? amount * 16 : amount;
}

export const nativeTheme = {
  light: tokens.color.light,
  dark: tokens.color.dark,
} as const;

export const nativeSpacing = toPixels(tokens.spacing);
export const nativeRadius = toPixels(tokens.radius);

export const nativeFontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export function withAlpha(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  const normalized =
    value.length === 3
      ? value
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : value;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
