import { NextResponse } from 'next/server';
import { getQueueStatus } from '../render/route';

export async function GET() {
  const queue = getQueueStatus();
  
  return NextResponse.json({
    status: queue.isRendering ? 'rendering' : 'idle',
    queue: {
      current: queue.queueLength,
      max: queue.maxQueue,
      available: queue.maxQueue - queue.queueLength,
    },
    specs: {
      codec: 'H.264',
      resolution: '1080x1920',
      fps: 30,
      duration: '15s',
      maxFileSize: '1MB',
      maxDataPoints: 500,
      timeoutSeconds: 120,
    },
  });
}
