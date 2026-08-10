import colors from "@/constants/colors";

/**
 * NightMap is a dark-only brand — always returns the dark palette.
 */
export function useColors() {
  const palette = colors.dark ?? colors.light;
  return { ...palette, radius: colors.radius };
}
