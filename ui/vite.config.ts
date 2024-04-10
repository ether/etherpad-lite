// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
    base: '/views/',
    build: {
        outDir: resolve(__dirname, '../src/static/oidc'),
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'consent.html'),
                nested: resolve(__dirname, 'login.html'),
            },
        },
        emptyOutDir: true,
    },
})
