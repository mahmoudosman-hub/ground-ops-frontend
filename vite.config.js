import { defineConfig } from 'vite'
import { execSync } from 'child_process'

// Get git info for build metadata
function getGitInfo() {
  try {
    return {
      commit: execSync('git rev-parse --short HEAD').toString().trim(),
      branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
      date: new Date().toISOString(),
    }
  } catch (e) {
    return { commit: 'unknown', branch: 'unknown', date: new Date().toISOString() }
  }
}

export default defineConfig({
  server: {
    port: 5173,
    strictPort: false,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.VITE_APP_ENV === 'production' ? false : true,
    minify: 'terser',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'leaflet': ['leaflet'],
          'axios': ['axios'],
        },
      },
    },
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __GIT_INFO__: JSON.stringify(getGitInfo()),
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  optimizeDeps: {
    include: ['axios', 'leaflet'],
  },
})
