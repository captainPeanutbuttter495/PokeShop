import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  console.log('Building with mode:', mode)
  console.log('VITE_API_URL:', env.VITE_API_URL || 'NOT SET')

  return {
    plugins: [react()],
    base: '/',
    define: {
      // Make env variables available if needed
    }
  }
})