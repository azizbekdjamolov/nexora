"use client";

interface WeekChartProps {
  days: { date: string; value: number }[];
  max?: number;
  height?: number;
  label: (value: number) => string;
  dayLabel?: (date: string) => string;
}

/** Simple SVG bar chart for the last 7 days. */
export function WeekChart({ days, max, height = 120, label, dayLabel }: WeekChartProps) {
  const peak = max ?? Math.max(...days.map((d) => d.value), 1);
  const stepX = 100 / Math.max(1, days.length);
  const barW = Math.min(28, stepX * 0.55);

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" role="img" preserveAspectRatio="none" style={{ height }}>
      {days.map((d, i) => {
        const h = (d.value / peak) * (height - 24);
        const x = i * stepX + (stepX - barW) / 2;
        const y = height - h;
        const filled = d.value > 0;
        return (
          <g key={d.date}>
            <rect x={x} y={y} width={barW} height={Math.max(filled ? 3 : 1, h)} rx={3} className={filled ? "fill-primary-500/80" : "fill-surface-border/50"} />
            {dayLabel ? (
              <text x={i * stepX + stepX / 2} y={height - 4} textAnchor="middle" className="fill-text-muted text-[8px]">
                {dayLabel(d.date)}
              </text>
            ) : null}
            {d.value > 0 ? (
              <title>{`${dayLabel ? dayLabel(d.date) : d.date}: ${label(d.value)}`}</title>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Short weekday label (Mon…Sun) from a YYYY-MM-DD string. */
export function weekdayLabel(date: string, shortNames: string[]): string {
  const d = new Date(`${date}T00:00:00Z`);
  const idx = (d.getUTCDay() + 6) % 7;
  return shortNames[idx] ?? date.slice(5);
}