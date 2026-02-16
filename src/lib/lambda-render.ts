/**
 * Remotion Lambda render client
 * Handles cloud rendering when AWS credentials are configured
 */

import {
  renderMediaOnLambda,
  getRenderProgress,
  speculateFunctionName,
  AwsRegion,
} from '@remotion/lambda/client';

// Check if Lambda is configured
export function isLambdaConfigured(): boolean {
  return !!(
    process.env.REMOTION_AWS_ACCESS_KEY_ID &&
    process.env.REMOTION_AWS_SECRET_ACCESS_KEY &&
    process.env.REMOTION_AWS_REGION
  );
}

// Get AWS region from env
export function getRegion(): AwsRegion {
  return (process.env.REMOTION_AWS_REGION || 'us-east-1') as AwsRegion;
}

// Get function name (uses Remotion's naming convention)
export function getFunctionName(): string {
  return process.env.REMOTION_FUNCTION_NAME || speculateFunctionName({
    diskSizeInMb: 2048,
    memorySizeInMb: 2048,
    timeoutInSeconds: 120,
  });
}

// Get serve URL (deployed site on S3)
export function getServeUrl(): string {
  if (!process.env.REMOTION_SERVE_URL) {
    throw new Error('REMOTION_SERVE_URL not configured. Run: npx remotion lambda sites create src/index.ts --site-name=reel-chart');
  }
  return process.env.REMOTION_SERVE_URL;
}

export interface RenderRequest {
  data: Array<{ date: string; series_a: number | null; series_b: number | null }>;
  labelA: string;
  labelB: string;
  hookText?: string;
  takeawayText?: string;
  highlightIndex?: number;
}

export interface RenderResult {
  renderId: string;
  bucketName: string;
  region: string;
}

export interface ProgressResult {
  done: boolean;
  progress: number; // 0-100
  outputFile?: string;
  downloadUrl?: string;
  errors?: string[];
}

/**
 * Start a render on Lambda
 */
export async function startLambdaRender(props: RenderRequest): Promise<RenderResult> {
  const region = getRegion();
  const functionName = getFunctionName();
  const serveUrl = getServeUrl();

  console.log(`[Lambda] Starting render on ${region}/${functionName}`);
  console.log(`[Lambda] Serve URL: ${serveUrl}`);
  console.log(`[Lambda] Data points: ${props.data.length}`);

  const result = await renderMediaOnLambda({
    region,
    functionName,
    serveUrl,
    composition: 'ReelChart',
    inputProps: {
      data: props.data,
      labelA: props.labelA || 'Series A',
      labelB: props.labelB || 'Series B',
      hookText: props.hookText || '',
      takeawayText: props.takeawayText || '',
      highlightIndex: props.highlightIndex ?? Math.floor(props.data.length / 2),
    },
    codec: 'h264',
    // Video specs
    framesPerLambda: 30, // ~1 second per chunk
    privacy: 'public', // Makes download URL accessible
    // Output naming
    outName: `reel-${Date.now()}.mp4`,
  });

  console.log(`[Lambda] Render started: ${result.renderId}`);
  
  return {
    renderId: result.renderId,
    bucketName: result.bucketName,
    region,
  };
}

/**
 * Get progress of a Lambda render
 */
export async function getLambdaProgress(
  renderId: string,
  bucketName: string
): Promise<ProgressResult> {
  const region = getRegion();
  const functionName = getFunctionName();

  const progress = await getRenderProgress({
    renderId,
    bucketName,
    region,
    functionName,
  });

  // Calculate overall progress percentage
  const progressPercent = Math.round(
    (progress.overallProgress ?? 0) * 100
  );

  // Check for errors
  const errors: string[] = [];
  if (progress.fatalErrorEncountered) {
    errors.push(progress.errors?.[0]?.message || 'Unknown fatal error');
  }

  // Build result
  const result: ProgressResult = {
    done: progress.done,
    progress: progressPercent,
    errors: errors.length > 0 ? errors : undefined,
  };

  // If done, include download URL
  if (progress.done && progress.outputFile) {
    result.outputFile = progress.outputFile;
    result.downloadUrl = progress.outputFile; // S3 public URL
    console.log(`[Lambda] Render complete: ${progress.outputFile}`);
  }

  return result;
}
