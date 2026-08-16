import type { Metadata, Viewport } from "next";
import { TelegramProvider } from "@/lib/telegram";

export const metadata: Metadata = {
  title: "NEXORA Mini App",
  description: "NEXORA Mini App — your wellness tracker inside Telegram.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function MiniLayout({ children }: { children: React.ReactNode }) {
  return <TelegramProvider>{children}</TelegramProvider>;
}