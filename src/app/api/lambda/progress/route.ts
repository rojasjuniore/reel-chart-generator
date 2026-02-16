import { NextRequest, NextResponse } from 'next/server';
import {
  isLambdaConfigured,
  getLambdaProgress,
} from '@/lib/lambda-render';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const renderId = searchParams.get('renderId');
  const bucketName = searchParams.get('bucketName');

  // Validate params
  if (!renderId || !bucketName) {
    return NextResponse.json(
      { error: 'Missing required params: renderId, bucketName' },
      { status: 400 }
    );
  }

  // Check Lambda is configured
  if (!isLambdaConfigured()) {
    return NextResponse.json(
      { error: 'Lambda not configured' },
      { status: 503 }
    );
  }

  try {
    const progress = await getLambdaProgress(renderId, bucketName);

    return NextResponse.json({
      renderId,
      ...progress,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Progress] Error for ${renderId}:`, errorMsg);

    return NextResponse.json(
      { error: 'Failed to get progress', details: errorMsg },
      { status: 500 }
    );
  }
}
