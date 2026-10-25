import { TrustBadge } from '../components/TrustBadge';
import { tokens } from '../generated/tokens';

const brandMark = `${import.meta.env.BASE_URL}nightmap-mark.png`;

const CORE_ROLES = [
  'primary',
  'accent',
  'destructive',
  'background',
  'card',
  'secondary',
  'muted',
] as const;

const TOKEN_ROLES = Object.keys(tokens.color.dark) as Array<
  keyof typeof tokens.color.dark
>;

const TYPE_SAMPLES = [
  { name: 'Title', size: 24, weight: 700 },
  { name: 'Section heading', size: 20, weight: 700 },
  { name: 'Body', size: 16, weight: 400 },
  { name: 'Supporting text', size: 14, weight: 400 },
  { name: 'Label', size: 12, weight: 600 },
  { name: 'Trust badge', size: 10, weight: 600 },
] as const;

function ColorTile({
  name,
  value,
  foreground,
}: {
  name: string;
  value: string;
  foreground?: string;
}) {
  return (
    <div
      className="min-h-24 rounded-xl border p-3"
      style={{ backgroundColor: value, color: foreground ?? tokens.color.dark.foreground }}
    >
      <p className="text-sm font-semibold">{name}</p>
      <p className="mt-1 font-mono text-xs opacity-80">{value}</p>
    </div>
  );
}

function ColorMode({ mode }: { mode: 'light' | 'dark' }) {
  const colors = tokens.color[mode];
  const foregrounds = {
    primary: colors.primaryForeground,
    accent: colors.accentForeground,
    destructive: colors.destructiveForeground,
    background: colors.foreground,
    card: colors.cardForeground,
    secondary: colors.secondaryForeground,
    muted: colors.mutedForeground,
  };

  return (
    <section
      className="space-y-4 rounded-2xl border p-5"
      style={{
        backgroundColor: colors.background,
        color: colors.foreground,
        borderColor: colors.border,
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold capitalize">{mode} mode</h3>
        <span className="text-xs opacity-70">Semantic roles</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CORE_ROLES.map((role) => (
          <ColorTile
            key={role}
            name={role}
            value={colors[role]}
            foreground={foregrounds[role]}
          />
        ))}
      </div>
    </section>
  );
}

export function OverviewPage() {
  return (
    <div className="space-y-5">
      <section className="grid gap-5 rounded-2xl border bg-card p-6 text-card-foreground lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Night-time discovery
          </p>
          <h2 className="mt-3 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
            Find your people. Make a plan. Get home safely.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            NightMap pairs a luminous location mark with dark, low-glare surfaces,
            coral actions, and warm trust accents.
          </p>
        </div>
        <img
          src={brandMark}
          alt="NightMap location mark"
          className="h-28 w-28 rounded-3xl object-cover"
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border bg-card p-5 text-card-foreground">
          <div>
            <h3 className="font-semibold">Core palette</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Coral leads actions; orange carries trust and safety emphasis.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ColorTile name="Coral" value={tokens.color.dark.primary} foreground={tokens.color.dark.primaryForeground} />
            <ColorTile name="Safety orange" value={tokens.color.dark.accent} foreground={tokens.color.dark.accentForeground} />
            <ColorTile name="Night surface" value={tokens.color.dark.card} />
            <ColorTile
              name="Positive"
              value={tokens.color.dark.chart3}
              foreground={tokens.color.dark.background}
            />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-5 text-card-foreground">
          <div>
            <h3 className="font-semibold">Typography</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Inter is used across NightMap’s interface.
            </p>
          </div>
          <div className="space-y-3">
            {TYPE_SAMPLES.slice(0, 4).map((sample) => (
              <p
                key={sample.name}
                style={{ fontSize: sample.size, fontWeight: sample.weight }}
              >
                {sample.name}
              </p>
            ))}
          </div>
        </section>
      </div>

      <section className="space-y-4 rounded-2xl border bg-card p-5 text-card-foreground">
        <div>
          <h3 className="font-semibold">Source-backed component</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The reusable trust signal shown on discovery cards and companion profiles.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TrustBadge score={92} size="sm" />
          <TrustBadge score={98} size="md" />
        </div>
      </section>

      <p className="text-xs leading-5 text-muted-foreground">
        No separate written design guide was found in the source project. The
        foundations here are extracted from the app’s theme, assets, and shared UI.
      </p>
    </div>
  );
}

export function BrandPage() {
  return (
    <div className="space-y-5">
      <section className="grid gap-6 rounded-2xl border bg-card p-6 text-card-foreground sm:grid-cols-[auto_1fr] sm:items-center">
        <img
          src={brandMark}
          alt="NightMap location mark on a star field"
          className="h-40 w-40 rounded-3xl object-cover"
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            App icon
          </p>
          <h2 className="mt-2 text-2xl font-bold">NightMap location mark</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            The app ships a square, rounded map-pin mark with a magenta glow and
            star-field details. This is the available source asset; no separate
            horizontal wordmark or written clear-space rules were found.
          </p>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        <ColorTile name="Night background" value={tokens.color.dark.background} />
        <ColorTile name="NightMap coral" value={tokens.color.dark.primary} foreground={tokens.color.dark.primaryForeground} />
        <ColorTile name="Safety orange" value={tokens.color.dark.accent} foreground={tokens.color.dark.accentForeground} />
      </section>
    </div>
  );
}

export function ColorsPage() {
  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        Both palettes share the same semantic role names. The app is dark-first;
        light values are included for system appearance changes.
      </p>
      <ColorMode mode="dark" />
      <ColorMode mode="light" />
      <section className="rounded-2xl border bg-card p-5 text-card-foreground">
        <h3 className="font-semibold">Supporting status colors</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TOKEN_ROLES.filter((role) => role.startsWith('chart')).map((role) => (
            <ColorTile
              key={role}
              name={role.replace('chart', 'status ')}
              value={tokens.color.dark[role]}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export function FontsPage() {
  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-2xl border bg-card p-6 text-card-foreground">
        <div>
          <h2 className="text-2xl font-bold">Inter</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The app uses Inter Regular, Medium, SemiBold, and Bold.
          </p>
        </div>
        <div className="space-y-4 border-t border-border pt-4">
          {TYPE_SAMPLES.map((sample) => (
            <div
              key={sample.name}
              className="grid gap-1 sm:grid-cols-[140px_1fr]"
            >
              <span className="text-xs font-medium text-muted-foreground">
                {sample.name} · {sample.size}px
              </span>
              <p style={{ fontSize: sample.size, fontWeight: sample.weight }}>
                Trust, clarity, and a good night out.
              </p>
            </div>
          ))}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">
        Type sizes shown are observed in the app’s shared UI and screens; the
        original project does not define a formal type scale.
      </p>
    </div>
  );
}

export function LayoutPage() {
  const spacingBase = Number.parseFloat(tokens.spacing) * 16;
  const radiusBase = Number.parseFloat(tokens.radius) * 16;
  const spacingSteps = [1, 2, 3, 4, 6, 8];
  const radiusSteps = [
    { name: 'Small', value: radiusBase - 4 },
    { name: 'Medium', value: radiusBase - 2 },
    { name: 'Base', value: radiusBase },
    { name: 'Large', value: radiusBase + 4 },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="space-y-4 rounded-2xl border bg-card p-6 text-card-foreground">
        <div>
          <h2 className="font-semibold">Spacing</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {spacingBase}px base step, multiplied for component spacing.
          </p>
        </div>
        <div className="space-y-3">
          {spacingSteps.map((step) => (
            <div key={step} className="flex items-center gap-3">
              <span className="w-12 font-mono text-xs text-muted-foreground">
                {step * spacingBase}px
              </span>
              <div
                className="h-3 rounded-full bg-primary"
                style={{ width: step * spacingBase }}
              />
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-4 rounded-2xl border bg-card p-6 text-card-foreground">
        <div>
          <h2 className="font-semibold">Radius</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {radiusBase}px base radius; chip components can use their own shape.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {radiusSteps.map((step) => (
            <div
              key={step.name}
              className="flex h-20 items-end border bg-muted p-3"
              style={{ borderRadius: step.value }}
            >
              <span className="text-xs font-medium">
                {step.name} · {step.value}px
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
