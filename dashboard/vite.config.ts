import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => {
  // A Vercel build without VITE_API_BASE would silently point at http://localhost:8000.
  if (command === "build" && process.env.VERCEL && !loadEnv(mode, process.cwd(), "VITE_").VITE_API_BASE) {
    throw new Error("VITE_API_BASE must be set to the backend's https:// URL for Vercel builds.");
  }
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
    },
  };
});
