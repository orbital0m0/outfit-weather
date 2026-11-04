import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         → 배포용 PWA (Vercel)
// `npm run build:preview` → 미리보기용 단일 HTML (서비스워커 없음)
// GitHub Pages는 /outfit-weather/ 아래에서 열리므로 BASE_PATH로 경로를 맞춘다 (Vercel은 기본값 '/')
const base = process.env.BASE_PATH ?? '/';

export default defineConfig(({ mode }) => ({
  base: mode === 'preview' ? './' : base,
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
            theme_color: '#f3f5f7',
            background_color: '#f3f5f6',
            display: 'standalone',
            start_url: '.',
            scope: '.',
            icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
          },
        }),
  ],
  build: mode === 'preview' ? { outDir: 'dist-preview' } : undefined,
}));
