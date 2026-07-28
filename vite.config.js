import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// Set `base` dynamically so the app works when deployed to GitHub Pages
// For local dev it stays '/', for production builds it becomes '/<repo-name>/'
const repoName = process.env.GH_PAGES_REPO || 'edwic-dash-alpha';
const isProd = process.env.NODE_ENV === 'production' || process.env.CI === 'true';
const base = process.env.BASE_URL || (isProd ? `/${repoName}/` : '/');

export default defineConfig({
  plugins: [react()],
  base,
});
