import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');

const indexHtml = path.join(distDir, 'index.html');
const fallback404 = path.join(distDir, '404.html');
const vercelJson = path.join(distDir, 'vercel.json');

if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, fallback404);
  console.log('✓ Generated dist/404.html for SPA fallback');
}

const vercelConfig = {
  rewrites: [
    { source: '/api/(.*)', destination: 'https://matro-indoor-booking-indol.vercel.app/api/$1' },
    { source: '/(.*)', destination: '/index.html' }
  ]
};

fs.writeFileSync(vercelJson, JSON.stringify(vercelConfig, null, 2), 'utf-8');
console.log('✓ Generated dist/vercel.json for Vercel SPA routing');
