import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
    css: false,
    // The longest form test takes 3.8 s on an idle laptop, too close to the
    // 5000 ms default once the machine is busy.
    testTimeout: 15000,
  },
});
