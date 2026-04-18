import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Don't inline assets — keeps the main JS bundle slim
    assetsInlineLimit: 4096,
    // Generate sourcemaps only for preview builds; set to false for production to shave size
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split vendor chunks so React + Firebase aren't re-downloaded on every deploy
        manualChunks: {
          react: ["react", "react-dom"],
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
        },
      },
    },
  },
});
