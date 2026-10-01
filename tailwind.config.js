/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        hud: {
          bg: "rgba(var(--qb-glass-rgb), var(--qb-glass-alpha))",
          border: "rgba(var(--qb-border-rgb), var(--qb-border-alpha))",
        },
        difficulty: {
          veryeasy: "#c9c9d1",
          easy: "#3ddc84",
          medium: "#3d9cdc",
          hard: "#a55cff",
          epic: "#ffd23d",
          legendary: "#ff4d4d",
        },
      },
      backdropBlur: {
        hud: "var(--qb-blur)",
      },
      borderRadius: {
        hud: "20px",
      },
      boxShadow: {
        hud: "0 8px 32px rgba(0, 0, 0, 0.45)",
        glow: "0 0 24px rgba(124, 92, 255, 0.35)",
      },
      fontFamily: {
        hud: ["Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
