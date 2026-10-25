import { TrustBadge } from '../../components/TrustBadge';

export function TrustBadgeDemo() {
  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-2xl border bg-card p-5 text-card-foreground">
        <div>
          <h2 className="font-semibold">Sizes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Source API: score is shown as a percent; size defaults to medium.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <TrustBadge score={86} size="sm" />
          <TrustBadge score={98} />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5 text-card-foreground">
        <h2 className="font-semibold">In a companion row</h2>
        <div className="flex max-w-md items-center gap-4 rounded-xl border bg-background p-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-accent/15 font-semibold text-accent">
            A
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Amara, 27</p>
            <p className="text-xs text-muted-foreground">2.4 km · UGX 45k/hr</p>
          </div>
          <TrustBadge score={94} size="sm" />
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 text-card-foreground">
        <h2 className="font-semibold">Usage notes</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>Use the badge to display an existing trust score, not as a generic status chip.</li>
          <li>Use the small size on compact map/discovery cards and medium in profile details.</li>
          <li>Keep the shield-check icon and warm orange accent paired with the percentage.</li>
        </ul>
      </section>
    </div>
  );
}
