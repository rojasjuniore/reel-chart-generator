import { NextRequest, NextResponse } from 'next/server';
import { renderMediaOnLambda } from '@remotion/lambda/client';
import { getLambdaConfig, validateLambdaConfig, COMPOSITION_ID } from '@/lib/lambda-config';

// Limits
const MAX_BODY_SIZE = 1_000_000; // 1MB
const MAX_DATA_POINTS = 500;
const MAX_CONCURRENT_RENDERS = 3;

// In-memory render tracking (for queue management)
const activeRenders = new Set<string>();

export async function POST(request: NextRequest) {
  const requestId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  
  console.log(`[${requestId}] 📥 Export request received`);

  try {
    // Check Lambda configuration
    const validation = validateLambdaConfig();
    if (!validation.valid) {
      console.log(`[${requestId}] ❌ Lambda not configured: ${validation.error}`);
      return NextResponse.json(
        { 
          error: 'Cloud export not configured',
          details: validation.error,
          configured: false,
        },
        { status: 503 }
      );
    }

    // Check queue
    if (activeRenders.size >= MAX_CONCURRENT_RENDERS) {
      console.log(`[${requestId}] ❌ Queue full (${activeRenders.size}/${MAX_CONCURRENT_RENDERS})`);
      return NextResponse.json(
        { 
          error: 'Server busy',
          details: `Too many renders in progress (${activeRenders.size}). Try again shortly.`,
          queueLength: activeRenders.size,
        },
        { status: 429 }
      );
    }

    // Validate body size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: `Request too large. Max ${MAX_BODY_SIZE / 1_000_000}MB` },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { data, labelA, labelB, hookText, takeawayText, highlightIndex } = body;

    // Validate input
    if (!data || !Array.isArray(data) || data.length < 2) {
      return NextResponse.json(
        { error: 'Invalid data. Need at least 2 data points.' },
        { status: 400 }
      );
    }

    if (data.length > MAX_DATA_POINTS) {
      return NextResponse.json(
        { error: `Too many data points: ${data.length}. Max ${MAX_DATA_POINTS}` },
        { status: 400 }
      );
    }

    const config = getLambdaConfig();
    
    console.log(`[${requestId}] 🚀 Starting Lambda render...`);
    console.log(`[${requestId}] Region: ${config.region}, Function: ${config.functionName}`);

    // Build input props
    const inputProps = {
      data,
      labelA: labelA || 'Series A',
      labelB: labelB || 'Series B',
      hookText: hookText || '',
      takeawayText: takeawayText || '',
      highlightIndex: highlightIndex ?? Math.floor(data.length / 2),
    };

    // Start Lambda render
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: config.region as 'us-east-1',
      functionName: config.functionName,
      serveUrl: config.serveUrl,
      composition: COMPOSITION_ID,
      inputProps,
      codec: 'h264',
      imageFormat: 'jpeg',
      maxRetries: 1,
      privacy: 'public',
      downloadBehavior: {
        type: 'download',
        fileName: `${(labelA || 'chart').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.mp4`,
      },
    });

    // Track active render
    activeRenders.add(renderId);

    console.log(`[${requestId}] ✅ Lambda render started: ${renderId}`);

    return NextResponse.json(
      {
        status: 'rendering',
        renderId,
        bucketName,
        requestId,
        message: 'Render started. Poll /api/status for progress.',
      },
      { status: 202 }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${requestId}] ❌ Export error:`, errorMsg);

    return NextResponse.json(
      { 
        error: 'Export failed',
        details: errorMsg,
        requestId,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const validation = validateLambdaConfig();
  const config = getLambdaConfig();
  
  return NextResponse.json({
    configured: validation.valid,
    region: config.region,
    activeRenders: activeRenders.size,
    maxConcurrent: MAX_CONCURRENT_RENDERS,
    specs: {
      codec: 'H.264',
      resolution: '1080x1920',
      fps: 30,
      duration: '15s',
    },
  });
}
