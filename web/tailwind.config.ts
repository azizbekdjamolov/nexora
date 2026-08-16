import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef3ff",
          100: "#dce6ff",
          200: "#b9ccff",
          300: "#8faeff",
          400: "#6b8dff",
          500: "#4f6bff",
          600: "#3d4df2",
          700: "#333fd6",
          800: "#2d37ad",
          900: "#2b3488",
        },
        accent: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          raised: "hsl(var(--surface-raised))",
          border: "hsl(var(--surface-border))",
        },
        text: {
          DEFAULT: "hsl(var(--text))",
          muted: "hsl(var(--text-muted))",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out both",
        "slide-up": "slideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "float-slow": "floatSlow 8s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glow: "0 0 40px -8px hsl(var(--glow))",
        "glow-sm": "0 0 24px -8px hsl(var(--glow))",
      },
    },
  },
  plugins: [],
};

export default config;