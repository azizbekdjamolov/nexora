import { MiniShell } from "@/features/miniapp/components/MiniShell";
import { MiniHome } from "@/features/miniapp/components/MiniHome";

export default function MiniPage() {
  return (
    <MiniShell>
      <MiniHome />
    </MiniShell>
  );
}