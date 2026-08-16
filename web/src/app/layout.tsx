import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/lib/toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: {
    default: "NEXORA — AI Wellness Platform",
    template: "%s · NEXORA",
  },
  description:
    "NEXORA — an AI-powered health, sport and wellness platform: website, Telegram bot and Mini App on one shared engine, with real-time sync and an AI wellness coach.",
  keywords: ["health", "wellness", "sport", "habits", "water", "sleep", "ai", "telegram", "mini app", "platform"],
  openGraph: {
    title: "NEXORA — AI Wellness Platform",
    description: "Track water, sleep, activity, workouts, habits and goals — with AI coaching across website, bot and Mini App.",
    type: "website",
    siteName: "NEXORA",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05070f" },
    { media: "(prefers-color-scheme: light)", color: "#f7f9ff" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

function initialTheme(): "dark" | "light" {
  const store = cookies();
  const theme = store.get("up_theme")?.value;
  if (theme === "dark" || theme === "light") return theme;
  return "light";
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = initialTheme();

  return (
    <html lang="en" className={theme === "dark" ? "dark" : ""} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('up_theme')||document.cookie.match(/(?:^|; )up_theme=([^;]*)/)?.[1];var s=localStorage.getItem('up_lang')||document.cookie.match(/(?:^|; )up_lang=([^;]*)/)?.[1];if(s)document.documentElement.lang=s;var pref=t||'system';if(pref==='dark'||(pref==='system'&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${display.variable} antialiased`}>
        <ThemeProvider>
          <I18nProvider>
            <ToastProvider>
              <AuthProvider>{children}</AuthProvider>
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}