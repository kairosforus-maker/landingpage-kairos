// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sanity from '@sanity/astro';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.kairos4us.com',
  integrations: [
    react(),
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: { es: 'es-CO', en: 'en' },
      },
    }),
    sanity({
      projectId: 'bam2qyc8',
      dataset: 'production',
      useCdn: true,
      apiVersion: '2024-06-24',
    }),
  ],
});
