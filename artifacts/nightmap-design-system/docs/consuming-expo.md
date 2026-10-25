# Consuming NightMap Design System in Expo apps

Read `artifacts/nightmap-design-system/docs/AGENTS.md` first. React Native does
not consume the web CSS or DOM components. It imports portable tokens, native
theme/hooks, and native components directly from this package. If the Expo app
still contains scaffolded or existing local theme/hooks/components, also read
`artifacts/nightmap-design-system/docs/migrating-expo.md` before writing UI.

## Native theme and fonts

Build the shared light/dark palette, numeric radius and spacing conversion, and
registered typography names in `src/lib/native-theme.tsx`. Convert CSS lengths
once inside this package:

```tsx
import { tokens } from "@workspace/nightmap-design-system/tokens";

const radius = tokens.radius.endsWith("rem")
  ? Number.parseFloat(tokens.radius) * 16
  : Number.parseFloat(tokens.radius);
```

Export `useColors` from `src/hooks/use-colors.tsx`. Export a font hook from
`src/hooks/use-fonts.tsx` that loads every required weight through `useFonts` and
returns `fontsLoaded` and `fontError`. Use exact registered names such as
`Inter_400Regular`, not CSS family names.

Expo imports these concrete paths directly:

```tsx
import { nativeTheme } from "@workspace/nightmap-design-system/lib/native-theme";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import { useDesignSystemFonts } from "@workspace/nightmap-design-system/hooks/use-fonts";
```

`useColors()` follows the device color scheme. Pass `"light"` or `"dark"` when
the app intentionally locks to one scheme; NightMap is dark-only and uses
`useColors("dark")` in its screens and app-owned components.

Keep the root layout's existing SplashScreen gating around the shared font
hook's `fontsLoaded` and `fontError` result.

## Native components

Before writing screens, inventory the app's visual building blocks and add only
the product-agnostic families present in this design system under
`src/components/native/`. The current source-backed native component is
`TrustBadge`; booking and other workflow compositions remain app-owned.

Where a web component has a native counterpart, match its family exports, prop
names, variants, sizes, defaults, and state semantics wherever React Native
supports them. Document platform-required differences in the base `AGENTS.md`
inventory.

Import the extracted native component directly:

```tsx
import { TrustBadge } from "@workspace/nightmap-design-system/components/native/TrustBadge";
```

Keep product data, navigation, state, and domain compositions in Expo. A
pet-adoption `DogCard`, for example, stays app-owned but composes package Card,
Button, Badge, and typography primitives.

## Dependencies and assets

When native package source imports `react-native`, Expo modules, or font
packages, declare compatible versions in this package's peer and development
dependencies and in the consuming Expo artifact's dependencies.

Metro resolves the workspace package through pnpm symlinks. Do not copy source
or token values. Loose binary assets may still need copying into Expo because
Metro does not watch sibling artifact folders by default.

Set `app.json`'s literal `splash.backgroundColor` from
`tokens.color.light.background` and keep it synchronized when that token changes.

## Verify

Import and render
`@workspace/nightmap-design-system/components/native/TrustBadge`, then run Expo
typecheck and the development workflow. The import, native theme, and font hook
must resolve before broader screen work begins.
