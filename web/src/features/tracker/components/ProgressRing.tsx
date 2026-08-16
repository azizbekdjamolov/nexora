"use client";

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label?: string;
  color?: string;
  trackColor?: string;
}

/** SVG circular progress indicator. */
export function ProgressRing({ value, max, size = 120, stroke = 10, label, color = "stroke-primary-500", trackColor = "stroke-surface-border" }: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const offset = circumference * (1 - ratio);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className={trackColor} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${color} transition-all duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label ? <span className="font-display text-xl font-bold text-text">{label}</span> : null}
      </div>
    </div>
  );
}