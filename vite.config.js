import { defineConfig } from 'vite';
import react      from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  build: {
    rollupOptions: {
      output: {
        /**
         * manualChunks — split the heaviest third-party libraries into
         * separate hashed chunks so the main entry stays small and each
         * library can be cached independently.
         *
         * Chunk map (approximate gzip sizes):
         *   vendor-react    ~45 kB   react + react-dom
         *   vendor-redux    ~15 kB   @reduxjs/toolkit + react-redux
         *   vendor-motion   ~55 kB   motion/react (framer-motion)
         *   vendor-lucide   ~30 kB   lucide-react icon tree
         *   vendor-swiper   ~35 kB   swiper
         */
        manualChunks(id) {
          /* react + react-dom — keep together (react-dom depends on react) */
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }

          /* Redux Toolkit + React-Redux bindings */
          if (id.includes('node_modules/@reduxjs/toolkit') ||
              id.includes('node_modules/react-redux')) {
            return 'vendor-redux';
          }

          /* Motion (ships as motion/react → framer-motion internally) */
          if (id.includes('node_modules/motion') ||
              id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }

          /* Lucide icon library */
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }

          /* Swiper */
          if (id.includes('node_modules/swiper')) {
            return 'vendor-swiper';
          }
        },
      },
    },

    /* Raise the per-chunk warning threshold to 600 kB now that the
       bundle is intentionally split.  The combined total is unchanged;
       no individual chunk should exceed this after splitting. */
    chunkSizeWarningLimit: 600,
  },
});
