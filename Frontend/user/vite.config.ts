import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import os from 'os';

// ⭐ FIX: Automatically detect local network IP for QR generation
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        historyApiFallback: true, // ⭐ PLUG-IN: allow /track/:id deep-links
        proxy: {
          '/api': {
            target: 'http://localhost:8000',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
          },
          // ⭐ FIX: Proxy Socket.IO WebSocket upgrades on the kiosk machine
          '/socket.io': {
            target: 'http://localhost:8000',
            changeOrigin: true,
            ws: true,
          }
        }
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          workbox: {
            // Cache static assets and api responses for offline support
            globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit to fix CartesianChart chunk issue
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/your-api-domain\.com\/.*$/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 7 // <== 7 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              }
            ]
          },
          manifest: {
            name: 'SUVIDHA Citizen Portal',
            short_name: 'SUVIDHA',
            description: 'Unified Civic Utility Self-Service KIOSK Platform',
            theme_color: '#ffffff',
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.VITE_LOCAL_IP': JSON.stringify(getLocalIP()) // Export local IP
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
