import { NextRequest, NextResponse } from 'next/server';
import { getRenderProgress } from '@remotion/lambda/client';
import { getLambdaConfig, validateLambdaConfig } from '@/lib/lambda-config';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const renderId = searchParams.get('renderId');
  const bucketName = searchParams.get('bucketName');

  // If no renderId, return general status
  if (!renderId) {
    const validation = validateLambdaConfig();
    return NextResponse.json({
      configured: validation.valid,
      message: validation.valid 
        ? 'Cloud export ready. Pass ?renderId=xxx to check render status.'
        : 'Cloud export not configured',
      specs: {
        codec: 'H.264',
        resolution: '1080x1920',
        fps: 30,
        duration: '15s',
      },
    });
  }

  // Check Lambda configuration
  const validation = validateLambdaConfig();
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'Cloud export not configured', configured: false },
      { status: 503 }
    );
  }

  try {
    const config = getLambdaConfig();
    
    const progress = await getRenderProgress({
      renderId,
      bucketName: bucketName || config.bucketName,
      region: config.region as 'us-east-1',
      functionName: config.functionName,
    });

    // Check for errors
    if (progress.fatalErrorEncountered) {
      return NextResponse.json({
        status: 'error',
        renderId,
        error: progress.errors?.[0]?.message || 'Render failed',
        errors: progress.errors,
      });
    }

    // Check if done
    if (progress.done) {
      return NextResponse.json({
        status: 'done',
        renderId,
        downloadUrl: progress.outputFile,
        outputSize: progress.outputSizeInBytes,
        renderTime: progress.timeToFinish,
        costs: progress.costs,
      });
    }

    // Still rendering - use only guaranteed properties
    return NextResponse.json({
      status: 'rendering',
      renderId,
      progress: progress.overallProgress ?? 0,
      totalFrames: 450, // 15s * 30fps
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Status check error for ${renderId}:`, errorMsg);

    return NextResponse.json(
      { 
        status: 'error',
        renderId,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
