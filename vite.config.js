import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

// GitHub Pages sets BASE_URL=/edwic-dash-alpha/. Android, Docker and local builds stay at /.
const base = process.env.BASE_URL || '/';

function githubPagesSpaFallback() {
  return {
    name: 'github-pages-spa-fallback',
    apply: 'build',
    closeBundle() {
      if (!base || base === '/' || base === './') return;
      const dist = resolve('dist');
      copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'));
    },
  };
}

export default defineConfig({
  plugins: [react(), githubPagesSpaFallback()],
  base,
});
