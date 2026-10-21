import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/strips-app/',
  plugins: [react()],
  test: {
    globals: false,
    environment: 'node',
  },
})
