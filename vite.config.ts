import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         → 배포용 PWA (Vercel)
// `npm run build:preview` → 미리보기용 단일 HTML (서비스워커 없음)
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'preview'
      ? viteSingleFile()
      : VitePWA({
          registerType: 'autoUpdate',
          manifest: {
            name: '그날의 옷',
            short_name: '그날의 옷',
            description: '그날 날씨와 옷차림, 체감을 기록하고 비슷한 날에 다시 꺼내 보는 앱',
            lang: 'ko',
            theme_color: '#2d5f86',
            background_color: '#f3f5f6',
            display: 'standalone',
            start_url: '/',
            icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
          },
        }),
  ],
  build: mode === 'preview' ? { outDir: 'dist-preview' } : undefined,
}));
