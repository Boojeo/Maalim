/**
 * Horizontal bar list for small anonymised counts (dataviz rules: one hue for one series, thin bars with a 4px
 * rounded data end, value at the tip in text colour, no legend for a single series, the table below is the
 * accessible alternative). A suppressed count (null) shows "<3" and no bar.
 */
export interface Bar {
  label: string;
  value: number | null;
}

export function BarList({ title, bars, hiddenLabel, unit }: { title: string; bars: Bar[]; hiddenLabel: string; unit?: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value ?? 0));
  return (
    <figure className="space-y-2" aria-label={title}>
      <figcaption className="font-bold">{title}</figcaption>
      <ul className="space-y-2">
        {bars.map((b) => {
          const text = b.value === null ? hiddenLabel : `${b.value}${unit ?? ""}`;
          return (
            <li key={b.label} className="grid grid-cols-[minmax(6rem,40%)_1fr] items-center gap-3 text-sm" title={`${b.label}: ${text}`}>
              <span className="text-ink">{b.label}</span>
              <span className="flex items-center gap-2">
                {b.value ? (
                  <span aria-hidden className="h-4 rounded-e bg-primary" style={{ width: `${Math.max(2, (b.value / max) * 100)}%`, maxWidth: "calc(100% - 3rem)" }} />
                ) : null}
                <span className="shrink-0 tabular-nums text-ink">{text}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
