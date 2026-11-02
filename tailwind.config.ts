import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mdc: {
          bg: "#111118",
          surface: "#181824",
          card: "#1E1E2D",
          cardHover: "#27273A",
          border: "rgba(255, 255, 255, 0.08)",
          borderLight: "rgba(255, 255, 255, 0.16)",
          red: "#D9381E",
          redDark: "#B82E17",
          crimson: "#6B1D14",
          crimsonLight: "#8B261A",
          cyan: "#0EA5E9",
          amber: "#F59E0B",
          emerald: "#10B981",
          purple: "#8B5CF6",
          muted: "#94A3B8",
          subtle: "#64748B",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        glowRed: "0 0 30px -5px rgba(217, 56, 30, 0.3)",
        glowCrimson: "0 0 30px -5px rgba(107, 29, 20, 0.4)",
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
