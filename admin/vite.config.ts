import { defineConfig } from 'vite'
import {viteStaticCopy} from "vite-plugin-static-copy";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [viteStaticCopy({
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
        }
        }
  }
})
