'use client';

import { Player } from '@remotion/player';
import { ChartComposition, type ChartCompositionProps } from './remotion/chart-composition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ChartPreviewProps {
  compositionProps: ChartCompositionProps;
  onExport: () => void;
  isExporting: boolean;
}

// Reel dimensions: 1080x1920 (9:16)
const REEL_WIDTH = 1080;
const REEL_HEIGHT = 1920;
const FPS = 30;
const DURATION_SECONDS = 15;

export function ChartPreview({ compositionProps, onExport, isExporting }: ChartPreviewProps) {
  // Scale for preview (fit in UI)
  const previewScale = 0.25;
  const previewWidth = REEL_WIDTH * previewScale;
  const previewHeight = REEL_HEIGHT * previewScale;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-dark-navy">4. Preview & Export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <div
            style={{
              width: previewWidth,
              height: previewHeight,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <Player
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              component={ChartComposition as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              inputProps={compositionProps as any}
              durationInFrames={DURATION_SECONDS * FPS}
              fps={FPS}
              compositionWidth={REEL_WIDTH}
              compositionHeight={REEL_HEIGHT}
              style={{
                width: previewWidth,
                height: previewHeight,
              }}
              controls
              loop
              autoPlay
            />
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Output: {REEL_WIDTH}x{REEL_HEIGHT} (9:16) • {DURATION_SECONDS}s • {FPS}fps</p>
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              // Re-trigger by remounting player
              window.location.reload();
            }}
          >
            🔄 Reset
          </Button>
          <Button
            onClick={onExport}
            disabled={isExporting}
            className="flex-1 bg-gold-accent hover:bg-gold-accent/90 text-dark-navy font-semibold"
          >
            {isExporting ? '⏳ Exporting...' : '🎬 Export MP4'}
          </Button>
        </div>

        {isExporting && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-blue-700 font-medium">Rendering video...</p>
            </div>
            <p className="text-blue-600 text-sm">
              This may take 30-60 seconds. Please wait...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
