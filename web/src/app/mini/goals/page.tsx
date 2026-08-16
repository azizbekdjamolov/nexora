import { MiniShell } from "@/features/miniapp/components/MiniShell";
import { MiniGoals } from "@/features/miniapp/components/MiniGoals";

export default function MiniGoalsPage() {
  return (
    <MiniShell>
      <MiniGoals />
    </MiniShell>
  );
}