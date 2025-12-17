#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const jsFile = path.join(distDir, 'server.js');
const cjsFile = path.join(distDir, 'server.cjs');

try {
  // Ensure dist directory exists
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Compile TypeScript to ES modules
  execSync('tsc src/server.ts --outDir dist --module ESNext --target ES2020 --moduleResolution node --skipLibCheck --esModuleInterop', { stdio: 'inherit' });
  console.log('TypeScript compiled successfully');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
