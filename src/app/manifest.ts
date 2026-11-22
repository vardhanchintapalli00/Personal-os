import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LifeOS',
    short_name: 'LifeOS',
    description: 'Tasks, fitness, food, money and habits in one place.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0b1020',
    theme_color: '#3b82f6',
    icons: [
      { src: '/pwa-icon?size=192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon?size=512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon?size=512&mask=1', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
