"use client";

interface StatCardProps {
  icon?: string;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}

export function StatCard({ icon, label, value, hint, accent }: StatCardProps) {
  return (
    <div className={`glass flex flex-col gap-1 rounded-2xl p-4 ${accent ? "bg-gradient-to-br from-primary-500/15 to-accent-500/10" : ""}`}>
      {icon ? <span className="text-lg" aria-hidden>{icon}</span> : null}
      <span className="text-xs text-text-muted">{label}</span>
      <span className="font-display text-xl font-bold text-text">{value}</span>
      {hint ? <span className="text-xs text-text-muted/70">{hint}</span> : null}
    </div>
  );
}