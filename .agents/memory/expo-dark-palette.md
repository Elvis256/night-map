---
name: Expo dark palette override
description: Expo web preview does not provide the native Appearance.setColorScheme API.
---

For a dark-only Expo app, pass the explicit `"dark"` override to the shared design-system `useColors` hook rather than trying to force the global color scheme with `Appearance.setColorScheme`.

**Why:** Expo's web preview does not implement `Appearance.setColorScheme`; calling it crashed the app, and the browser otherwise selected the light palette.

**How to apply:** Keep the design-system hook system-aware by default. Pass `"dark"` at the app's theme-hook call sites when that product is intentionally dark-only; do not change global appearance behavior for apps that should follow device settings.
