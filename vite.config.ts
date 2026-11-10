import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// HTTPS=1 (see `npm run dev:phone`) serves over HTTPS on your local network,
// because phones only allow the microphone on secure (https) pages.
const https = process.env.HTTPS === '1'

// base './' keeps all asset paths relative, so the build works on any host,
// from a sub-folder, or bundled inside Capacitor later.
export default defineConfig({
  base: './',
  plugins: [react(), ...(https ? [basicSsl()] : [])],
  server: { host: true },
  preview: { host: true },
})
