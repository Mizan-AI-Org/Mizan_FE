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
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // Core React runtime — loaded on every page
          if (/node_modules\/(react|react-dom|scheduler|use-sync-external-store)\//.test(id)) {
            return 'vendor-react';
          }
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('@tanstack/react-query')) return 'vendor-query';

          // UI kits (split so we don't ship everything upfront)
          if (id.includes('@radix-ui/')) return 'vendor-radix';
          if (id.includes('@mui/') || id.includes('@emotion/')) return 'vendor-mui';
          if (id.includes('lucide-react')) return 'vendor-icons';

          // Forms
          if (/node_modules\/(react-hook-form|@hookform|zod)\//.test(id)) {
            return 'vendor-forms';
          }

          // Heavy viz / docs — kept out of the main chunk so the app paints fast
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-map';
          if (id.includes('firebase')) return 'vendor-firebase';

          // DnD
          if (id.includes('@dnd-kit') || id.includes('react-dnd')) return 'vendor-dnd';

          // i18n
          if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n';

          // Date utils
          if (id.includes('date-fns')) return 'vendor-date';

          // Long-tail libs → single vendor bucket (not in main)
          return 'vendor-misc';
        },
      },
    },
  },
}));
