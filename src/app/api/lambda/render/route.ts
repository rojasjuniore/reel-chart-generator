import { NextRequest, NextResponse } from 'next/server';
import {
  isLambdaConfigured,
  startLambdaRender,
  RenderRequest,
} from '@/lib/lambda-render';

// Limits
const MAX_BODY_SIZE = 1_000_000; // 1MB
const MAX_DATA_POINTS = 500;

export async function POST(request: NextRequest) {
  const requestId = Date.now().toString(36);
  console.log(`[${requestId}] 📥 Lambda render request received`);

  try {
    // Check Lambda is configured
    if (!isLambdaConfigured()) {
      return NextResponse.json(
        { 
          error: 'Lambda not configured',
          details: 'Missing AWS credentials. Set REMOTION_AWS_ACCESS_KEY_ID, REMOTION_AWS_SECRET_ACCESS_KEY, REMOTION_AWS_REGION in environment.',
        },
        { status: 503 }
      );
    }

    // Check content length
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
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

    // Build render request
    const renderRequest: RenderRequest = {
      data,
      labelA: labelA || 'Series A',
      labelB: labelB || 'Series B',
      hookText: hookText || '',
      takeawayText: takeawayText || '',
      highlightIndex: highlightIndex ?? Math.floor(data.length / 2),
    };

    // Start Lambda render
    const result = await startLambdaRender(renderRequest);

    console.log(`[${requestId}] ✅ Lambda render started: ${result.renderId}`);

    return NextResponse.json({
      success: true,
      renderId: result.renderId,
      bucketName: result.bucketName,
      region: result.region,
      pollUrl: `/api/lambda/progress?renderId=${result.renderId}&bucketName=${result.bucketName}`,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${requestId}] ❌ Lambda error:`, errorMsg);

    return NextResponse.json(
      { error: 'Lambda render failed', details: errorMsg },
      { status: 500 }
    );
  }
}

export async function GET() {
  const configured = isLambdaConfigured();
  
  return NextResponse.json({
    configured,
    status: configured ? 'ready' : 'not_configured',
    requiredEnvVars: [
      'REMOTION_AWS_ACCESS_KEY_ID',
      'REMOTION_AWS_SECRET_ACCESS_KEY',
      'REMOTION_AWS_REGION',
      'REMOTION_SERVE_URL',
      'REMOTION_FUNCTION_NAME (optional)',
    ],
  });
}
