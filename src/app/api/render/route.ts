import { NextRequest, NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Video specs
const FPS = 30;
const DURATION_SECONDS = 15;
const WIDTH = 1080;
const HEIGHT = 1920;

// Reliability limits
const RENDER_TIMEOUT_MS = 120_000; // 120 seconds hard timeout
const MAX_BODY_SIZE = 1_000_000; // 1MB
const MAX_DATA_POINTS = 500; // reasonable limit

// Concurrency control (simple in-memory lock)
let isRendering = false;
const renderQueue: Array<() => void> = [];
const MAX_QUEUE_SIZE = 3; // Backpressure: reject if queue > 3

// Get current queue status
export function getQueueStatus() {
  return {
    isRendering,
    queueLength: renderQueue.length,
    maxQueue: MAX_QUEUE_SIZE,
  };
}

async function acquireRenderLock(): Promise<'acquired' | 'rejected'> {
  if (!isRendering) {
    isRendering = true;
    return 'acquired';
  }
  
  // Backpressure: reject if queue is full
  if (renderQueue.length >= MAX_QUEUE_SIZE) {
    return 'rejected';
  }
  
  // Wait in queue
  return new Promise((resolve) => {
    renderQueue.push(() => {
      isRendering = true;
      resolve('acquired');
    });
  });
}

function releaseRenderLock(): void {
  if (renderQueue.length > 0) {
    const next = renderQueue.shift();
    next?.();
  } else {
    isRendering = false;
  }
}

export async function POST(request: NextRequest) {
  const requestId = Date.now().toString(36);
  let propsFile: string | null = null;
  let outputPath: string | null = null;
  let renderProc: ChildProcess | null = null;
  let lockAcquired = false;

  console.log(`[${requestId}] 📥 Render request received`);

  try {
    // Check content length
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      console.log(`[${requestId}] ❌ Body too large: ${contentLength} bytes`);
      return NextResponse.json(
        { error: `Request body too large. Max ${MAX_BODY_SIZE / 1_000_000}MB` },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { data, labelA, labelB, hookText, takeawayText, highlightIndex } = body;

    // Validate input
    if (!data || !Array.isArray(data) || data.length < 2) {
      return NextResponse.json(
        { error: 'Invalid chart data. Need at least 2 data points.' },
        { status: 400 }
      );
    }

    if (data.length > MAX_DATA_POINTS) {
      return NextResponse.json(
        { error: `Too many data points: ${data.length}. Max ${MAX_DATA_POINTS}` },
        { status: 400 }
      );
    }

    // Acquire render lock (wait if another render is in progress)
    console.log(`[${requestId}] ⏳ Waiting for render lock... (queue: ${renderQueue.length})`);
    const lockResult = await acquireRenderLock();
    
    if (lockResult === 'rejected') {
      console.log(`[${requestId}] ❌ Queue full, rejecting request`);
      return NextResponse.json(
        { 
          error: 'Server busy', 
          details: 'Too many renders in queue. Try again later.',
          queueLength: renderQueue.length,
        },
        { status: 429 }
      );
    }
    
    lockAcquired = true;
    console.log(`[${requestId}] 🔒 Lock acquired, starting render`);

    // Create temp paths
    const timestamp = Date.now();
    const safeLabel = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `${safeLabel(labelA)}_vs_${safeLabel(labelB)}_${dateStr}.mp4`;
    
    propsFile = path.join(os.tmpdir(), `reel-props-${timestamp}.json`);
    outputPath = path.join(os.tmpdir(), `reel-${timestamp}-${filename}`);

    // Write props to temp file
    const inputProps = {
      data,
      labelA: labelA || 'Series A',
      labelB: labelB || 'Series B',
      hookText: hookText || '',
      takeawayText: takeawayText || '',
      highlightIndex: highlightIndex ?? Math.floor(data.length / 2),
    };
    
    fs.writeFileSync(propsFile, JSON.stringify(inputProps, null, 2));

    console.log(`[${requestId}] 🎬 Starting render...`);
    console.log(`[${requestId}] Props: ${propsFile}`);
    console.log(`[${requestId}] Output: ${outputPath}`);

    // Run the render script with timeout
    const scriptPath = path.join(process.cwd(), 'scripts', 'render-video.mjs');
    
    await new Promise<void>((resolve, reject) => {
      const startTime = Date.now();
      
      renderProc = spawn('node', [
        scriptPath,
        '--input', propsFile!,
        '--output', outputPath!,
      ], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      // Hard timeout
      const timeoutId = setTimeout(() => {
        console.log(`[${requestId}] ⏰ TIMEOUT after ${RENDER_TIMEOUT_MS / 1000}s`);
        if (renderProc) {
          renderProc.kill('SIGKILL');
        }
        reject(new Error(`Render timeout after ${RENDER_TIMEOUT_MS / 1000} seconds`));
      }, RENDER_TIMEOUT_MS);

      renderProc.stdout?.on('data', (data) => {
        stdout += data.toString();
        const line = data.toString().trim();
        if (line.includes('Render:') || line.includes('✅')) {
          console.log(`[${requestId}] ${line}`);
        }
      });

      renderProc.stderr?.on('data', (data) => {
        stderr += data.toString();
        console.error(`[${requestId}] STDERR: ${data.toString().trim()}`);
      });

      renderProc.on('close', (code) => {
        clearTimeout(timeoutId);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[${requestId}] Process exited with code ${code} in ${elapsed}s`);
        
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Render process exited with code ${code}\n${stderr || stdout}`));
        }
      });

      renderProc.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to start render process: ${err.message}`));
      });
    });

    console.log(`[${requestId}] ✅ Render complete!`);

    // Read the file and return as response
    const videoBuffer = fs.readFileSync(outputPath);
    const fileSize = (videoBuffer.length / 1024).toFixed(0);
    console.log(`[${requestId}] 📦 Output size: ${fileSize}KB`);
    
    // Cleanup temp files
    try {
      if (propsFile && fs.existsSync(propsFile)) fs.unlinkSync(propsFile);
      if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (cleanupError) {
      console.warn(`[${requestId}] Cleanup warning:`, cleanupError);
    }

    // Release lock before returning
    releaseRenderLock();
    lockAcquired = false;

    // Return video as downloadable file
    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(videoBuffer.length),
        'X-Render-Id': requestId,
      },
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${requestId}] ❌ Render error:`, errorMsg);
    
    // Cleanup on error
    try {
      if (propsFile && fs.existsSync(propsFile)) fs.unlinkSync(propsFile);
      if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (cleanupError) {
      console.warn(`[${requestId}] Cleanup warning:`, cleanupError);
    }

    // Release lock
    if (lockAcquired) {
      releaseRenderLock();
    }

    // Timeout -> 504
    if (errorMsg.includes('timeout')) {
      return NextResponse.json(
        { error: 'Render timeout', details: errorMsg },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Render failed', details: errorMsg },
      { status: 500 }
    );
  }
}

// Handle GET for status check
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    specs: {
      codec: 'H.264',
      resolution: `${WIDTH}x${HEIGHT}`,
      fps: FPS,
      duration: `${DURATION_SECONDS}s`,
    },
  });
}
