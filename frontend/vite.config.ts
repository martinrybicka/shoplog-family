import { randomUUID } from "node:crypto";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => {
  const build = command === "build" ? randomUUID() : "";
  return {
    define: { "import.meta.env.VITE_APP_BUILD": JSON.stringify(build) },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "shoplog-build-version",
        apply: "build",
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "version.json",
            source: JSON.stringify({ build }),
          });
        },
      },
    ],
    server: {
      port: 5173,
      strictPort: true,
      allowedHosts: ["localhost", "127.0.0.1", "frontend"],
      hmr: { clientPort: Number(process.env.HMR_CLIENT_PORT || 8080) },
      proxy: {
        "/api/": {
          target: process.env.API_PROXY_TARGET || "http://backend:8000",
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test-setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
    },
  };
});
