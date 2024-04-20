import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import svgr from 'vite-plugin-svgr'
import {viteStaticCopy} from "vite-plugin-static-copy";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), svgr(), viteStaticCopy({
      targets: [
          {
              src: '../src/locales',
              dest: ''
          }
      ]
  })],
    base: '/admin',
    build:{
      outDir: '../src/templates/admin',
        emptyOutDir: true,
    },
  server:{
    proxy: {
      '/socket.io/*': {
        target: 'http://localhost:9001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
        '/admin-auth/': {
            target: 'http://localhost:9001',
            changeOrigin: true,
        },
        '/stats': {
            target: 'http://localhost:9001',
            changeOrigin: true,
        }
        }
  }
})
