import { NextRequest, NextResponse } from 'next/server';

// NOTE: Server-side rendering with Remotion requires Chromium.
// For cloud deployments (Railway/Vercel), use Remotion Lambda or local CLI rendering.
// This MVP uses client-side preview only.

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Server-side render not available',
      message: 'Use the local CLI for video export. See LIMITS.md for instructions.',
      alternatives: [
        'Clone repo and run: npm run dev',
        'Use the browser preview (no download)',
        'Set up Remotion Lambda for serverless rendering',
      ],
    },
    { status: 501 }
  );
}

export async function GET() {
  return NextResponse.json({
    status: 'preview-only',
    message: 'Server-side rendering requires Chromium. Use local CLI for exports.',
    specs: {
      codec: 'H.264',
      resolution: '1080x1920',
      fps: 30,
      duration: '15s',
    },
    localExport: 'node scripts/render-video.mjs --input props.json --output video.mp4',
  });
}
