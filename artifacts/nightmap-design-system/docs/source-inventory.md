# NightMap source inventory

## Product and source basis

- Product: NightMap, a social discovery and companion-planning app.
- Primary source: the existing Expo app in `artifacts/mobile`.
- Brand asset: `artifacts/mobile/assets/images/icon.png`, copied to
  `public/nightmap-mark.png` for this style guide.
- Typography: Inter Regular, Medium, SemiBold, and Bold are loaded by the app
  from `@expo-google-fonts/inter`.
- Theme source: `artifacts/mobile/hooks/useColors.ts`.

The project has no separate written design guide. Values and usage notes below
are observations from the application source, not previously documented rules.

## Source-backed reusable component inventory

| Family | Public API | Consumers in NightMap | Source |
| --- | --- | --- | --- |
| Trust badge | `score: number`, `size?: "sm" \| "md"` (default `"md"`) | `app/(tabs)/index.tsx` discovery card; `app/companion/[id].tsx` profile | `artifacts/mobile/components/TrustBadge.tsx` |

The design-system component retains that API and percentage display. Its web
variant uses a shield-check glyph from Lucide; the native variant preserves the
source Ionicons glyph and React Native layout.

## Excluded app-specific compositions

Booking, filtering, connection, review, payment, and error-boundary components
remain owned by the app. They contain product state or workflow and do not form
general-purpose visual primitives. No other app-owned reusable visual primitive
was found in the shared component directory.

## Observed visual foundations

- Dark-first interface: near-black page background, raised charcoal cards, cool
  blue-gray dividers and muted text.
- Coral is the primary action color; orange is used for trust and safety
  emphasis. Green, blue, and violet are supporting semantic colors.
- Inter is the interface typeface; observed weights are regular, medium,
  semibold, and bold.
- The spacing token is 4px and the common base radius is 16px.
- The source trust badge has `sm` and `md` sizes, a 20px pill radius, and an
  orange shield/score treatment.
