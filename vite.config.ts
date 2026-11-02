import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import VueRouter from 'vue-router/vite'
import tailwindcss from '@tailwindcss/vite'
import { appConfig } from './src/config/env.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    VueRouter(),
    tailwindcss(),
    {
      name: 'inject-app-name',
      transformIndexHtml: (html) => html.replace('%APP_NAME%', appConfig.name),
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
