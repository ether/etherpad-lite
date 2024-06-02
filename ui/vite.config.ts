// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
    base: '/views/',
  server:{
    proxy:{
      "/static":{
        changeOrigin: true,
        target: "http://localhost:9001",
      }
    }
  },
  plugins: [
    commonjs({
      requireReturnsDefault: 'auto', // <---- this solves default issue
    }),

    // vite4
    // vitePluginRequire.default()
  ],
    build: {
        outDir: resolve(__dirname, '../src/static/oidc'),
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'consent.html'),
                nested: resolve(__dirname, 'login.html'),
                pad: resolve(__dirname, 'pad.html'),
            },
        },
        emptyOutDir: true,
    },
})
