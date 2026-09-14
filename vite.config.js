import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Chunks por rol: cada rol descarga solo sus vistas
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
              if (id.includes('sql.js')) return 'vendor-sql';
              if (id.includes('firebase')) return 'vendor-firebase';
              return 'vendor';
            }
            if (id.includes('/views/super/')) return 'views-super';
            if (id.includes('/views/admin/')) return 'views-admin';
            if (id.includes('/views/resident/')) return 'views-resident';
            if (id.includes('/views/guard/')) return 'views-guard';
            if (id.includes('/views/shared/')) return 'views-shared';
            return undefined;
          },
        },
      },
    },
  };
});
