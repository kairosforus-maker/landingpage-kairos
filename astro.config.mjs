// @ts-check
import { defineConfig } from 'astro/config';
import sanity from '@sanity/astro';

// https://astro.build/config
export default defineConfig({
  integrations: [
    sanity({
      projectId: 'bam2qyc8',
      dataset: 'production',
      useCdn: true,
      apiVersion: '2024-06-24',
    }),
  ],
});
