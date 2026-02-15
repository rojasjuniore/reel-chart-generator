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

export async function acquireRenderLock(): Promise<'acquired' | 'rejected'> {
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

export function releaseRenderLock(): void {
  if (renderQueue.length > 0) {
    const next = renderQueue.shift();
    next?.();
  } else {
    isRendering = false;
  }
}
