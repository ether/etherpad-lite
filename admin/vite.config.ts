import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import svgr from 'vite-plugin-svgr'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  server:{
    proxy: {
      '/socket.io/': {
        target: 'http://localhost:9001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
        '/api/auth': {
            target: 'http://localhost:9001',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/admin-prox/, '/admin/')
        }
    }
  }
})
