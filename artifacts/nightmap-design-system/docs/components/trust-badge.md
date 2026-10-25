# Trust badge

The trust badge is extracted from NightMap's shared badge and preserves its
public API:

```tsx
<TrustBadge score={94} size="sm" />
```

- `score` is displayed literally with a trailing percent sign.
- `size` is `"sm"` or `"md"` and defaults to `"md"`.
- The shield-check icon and orange accent communicate the app's trust score.
- Use the compact size on discovery/map cards and medium size in profile details,
  matching the source consumers.
- The web and Expo implementations share the API; the native implementation
  keeps the original Ionicons glyph.
