import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Manual chunking strategy:
        //
        // We deliberately do NOT carve out a separate `vendor-react` bucket.
        // Doing so used to cause inter-chunk cycles (vendor-react ↔ vendor-map,
        // vendor-react ↔ vendor-misc, vendor-misc ↔ vendor-radix), which at
        // runtime produced `Cannot read properties of undefined (reading
        // 'createContext')` and a blank screen — because Rollup can hoist a
        // CJS interop helper into vendor-map while react-leaflet's body lands
        // in the same chunk; vendor-react then imports the helper from there
        // and vendor-map imports React back, so React is `undefined` when
        // vendor-map evaluates first.
        //
        // Only carve out chunks that are TRUE LEAVES — they don't import each
        // other, only React (which we now leave in the entry chunk). This
        // gives us code-splitting wins without circular dependencies.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // Heavy, leaf-only libraries — safe to split off because nothing
          // else in node_modules imports them and they don't import each
          // other.
          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
          if (id.includes('firebase')) return 'vendor-firebase';

          // Everything else (including React, Radix, recharts, leaflet, etc.)
          // lands in the entry chunk or in per-route chunks chosen by Rollup,
          // which is cycle-free because there is no second `vendor-*` bucket
          // for the entry chunk to round-trip through.
          return undefined;
        },
      },
    },
  },
}));
