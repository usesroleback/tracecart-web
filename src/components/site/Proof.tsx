const STATS = [
  { value: "1,284", label: "Shipments delivered to landlocked destinations this year" },
  { value: "42h", label: "Median border dwell time, down from 71 hours" },
  { value: "97.6%", label: "Delivered complete and undamaged" },
] as const;

export function Proof() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-s)] bg-surface-sunken">
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: "repeating-linear-gradient(135deg, var(--color-line) 0px, var(--color-line) 1px, transparent 1px, transparent 14px)",
            }}
          />
          <p className="absolute bottom-4 left-4 right-4 rounded-[var(--radius-xs)] bg-surface-raised px-3 py-2 text-xs text-ink-muted shadow-[var(--shadow-1)]">
            Documentary photo: the Dakola border crossing at 4 a.m. — a TraceCart broker walking the queue with a
            clipboard. Real place, real people, no staging.
          </p>
        </div>

        <div className="space-y-8">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="sq-numeral-l">{stat.value}</p>
              <p className="mt-1 text-sm text-ink-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
