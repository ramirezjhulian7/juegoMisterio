import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El front habla con el back en :4000. En dev usamos proxy para /api y /uploads.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // escucha en 0.0.0.0 para que los móviles de la LAN entren
    proxy: {
      "/api": "http://localhost:4000",
      "/uploads": "http://localhost:4000",
      "/socket.io": { target: "http://localhost:4000", ws: true },
    },
  },
});
