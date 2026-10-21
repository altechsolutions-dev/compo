import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "compo-icon.svg",
        "compo-icon-192.png",
        "compo-icon-512.png",
      ],
      manifest: {
        name: "Compo",
        short_name: "Compo",
        description: "Votre espace de création.",
        theme_color: "#f3f5f0",
        background_color: "#f3f5f0",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/compo-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/compo-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
  ],
});
