#!/usr/bin/env node
/**
 * Standalone Remotion render script
 * Usage: node scripts/render-video.mjs --input props.json --output video.mp4
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

// Video specs
const COMPOSITION_ID = 'ReelChart';
const FPS = 30;
const DURATION_SECONDS = 15;
const WIDTH = 1080;
const HEIGHT = 1920;

async function main() {
  const args = process.argv.slice(2);
  
  // Parse args
  let inputFile = null;
  let outputFile = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputFile = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputFile = args[i + 1];
      i++;
    }
  }

  if (!inputFile || !outputFile) {
    console.error('Usage: node render-video.mjs --input props.json --output video.mp4');
    process.exit(1);
  }

  // Read input props
  const inputProps = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

  console.log('🎬 Starting Remotion render...');
  console.log('Input:', inputFile);
  console.log('Output:', outputFile);

  // Bundle the Remotion project
  const entryPoint = path.join(PROJECT_ROOT, 'src', 'remotion', 'index.tsx');
  
  console.log('📦 Bundling composition...');
  const bundleLocation = await bundle({
    entryPoint,
    onProgress: (progress) => {
      if (progress % 25 === 0) {
        console.log(`Bundle: ${progress}%`);
      }
    },
  });
  console.log('✅ Bundle complete');

  try {
    console.log('🎯 Selecting composition...');
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: COMPOSITION_ID,
      inputProps,
    });

    console.log('🎥 Rendering video...');
    await renderMedia({
      composition: {
        ...composition,
        width: WIDTH,
        height: HEIGHT,
        fps: FPS,
        durationInFrames: DURATION_SECONDS * FPS,
      },
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputFile,
      inputProps,
      onProgress: ({ progress }) => {
        const percent = Math.round(progress * 100);
        if (percent % 10 === 0) {
          console.log(`Render: ${percent}%`);
        }
      },
    });

    console.log('✅ Render complete!');
    console.log('Output:', outputFile);

    // Cleanup bundle
    fs.rmSync(bundleLocation, { recursive: true, force: true });

  } catch (error) {
    // Cleanup bundle on error
    try {
      fs.rmSync(bundleLocation, { recursive: true, force: true });
    } catch (e) { /* ignore */ }
    throw error;
  }
}

main().catch((err) => {
  console.error('❌ Render failed:', err.message);
  process.exit(1);
});
