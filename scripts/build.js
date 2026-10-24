const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function buildAll() {
  console.log('--- Starting AfterThought Build Orchestration ---');

  // 1. Ensure Electron build folders exist
  const distDir = path.join(__dirname, '../desktop-app/dist');
  const distRendererDir = path.join(__dirname, '../desktop-app/dist/renderer');
  
  fs.mkdirSync(distRendererDir, { recursive: true });

  // 2. Build the browser extension's recorder page (shares lib/capture with the web app)
  console.log('Building browser extension recorder...');
  await esbuild.build({
    entryPoints: [path.join(__dirname, '../extension/src/recording.ts')],
    bundle: true,
    outfile: path.join(__dirname, '../extension/dist/recording.js'),
    platform: 'browser',
    target: 'chrome110',
    format: 'iife',
  });
  console.log('✓ Browser extension recorder compiled.');

  // 3. Build Electron Main (Node TypeScript -> CommonJS JS)
  console.log('Building Electron main process...');
  await esbuild.build({
    entryPoints: [path.join(__dirname, '../desktop-app/main.ts')],
    bundle: true,
    outfile: path.join(distDir, 'main.js'),
    platform: 'node',
    target: 'node18',
    external: ['electron'],
  });
  console.log('✓ Electron main process compiled.');

  // 4. Build Electron Preload (Node TypeScript -> CommonJS JS)
  console.log('Building Electron preload script...');
  await esbuild.build({
    entryPoints: [path.join(__dirname, '../desktop-app/preload.ts')],
    bundle: true,
    outfile: path.join(distDir, 'preload.js'),
    platform: 'node',
    target: 'node18',
    external: ['electron'],
  });
  console.log('✓ Electron preload script compiled.');

  // 5. Build Electron Renderer React Application
  console.log('Building Electron renderer React app...');
  await esbuild.build({
    entryPoints: [path.join(__dirname, '../desktop-app/renderer/main.tsx')],
    bundle: true,
    outfile: path.join(distRendererDir, 'main.js'),
    platform: 'browser',
    target: 'chrome120',
    format: 'iife',
    loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'css' },
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  console.log('✓ Electron renderer React app compiled.');

  // 6. Copy Electron index.html to output dist directory
  console.log('Copying Electron index.html...');
  fs.copyFileSync(
    path.join(__dirname, '../desktop-app/renderer/index.html'),
    path.join(distRendererDir, 'index.html')
  );
  console.log('✓ Electron index.html copied.');

  console.log('--- AfterThought Build Orchestration Complete ---');
}

buildAll().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
