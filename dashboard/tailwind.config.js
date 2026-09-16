/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        gcs: {
          bg: "#0b1120",
          panel: "#111827",
          border: "#1f2937",
          accent: "#38bdf8",
          amber: "#f59e0b",
          red: "#ef4444",
          green: "#22c55e",
        },
      },
    },
  },
  plugins: [],
};
