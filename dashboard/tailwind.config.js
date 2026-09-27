/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // AERIS "Precision Aerospace Telemetry" design system
        canvas: "#F5F7FA",
        surface: "#FFFFFF",
        border: {
          DEFAULT: "#E3E8EF",
          muted: "#EEF2F6",
        },
        ink: {
          DEFAULT: "#0F172A",
          secondary: "#475569",
          muted: "#94A3B8",
        },
        primary: {
          DEFAULT: "#1E5EFF",
          hover: "#174ED8",
          active: "#1341B5",
        },
        secondary: {
          DEFAULT: "#0EA5A4",
        },
        status: {
          normal: "#16A34A",
          "normal-bg": "#F0FDF4",
          watch: "#F59E0B",
          "watch-bg": "#FFFBEB",
          warning: "#EA580C",
          "warning-bg": "#FFF7ED",
          critical: "#DC2626",
          "critical-bg": "#FEF2F2",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "0.75rem",
        control: "0.5rem",
        chip: "0.25rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)",
        elevated: "0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)",
      },
    },
  },
  plugins: [],
};
