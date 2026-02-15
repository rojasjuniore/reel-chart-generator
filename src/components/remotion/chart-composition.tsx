'use client';

import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';
import type { ChartDataPoint } from '@/lib/csv-parser';

// Brand colors
const COLORS = {
  darkNavy: '#0B1F3B',
  primaryBlue: '#1E3A8A',
  accentTeal: '#00B3B8',
  accentCyan: '#00C2E0',
  goldAccent: '#F5B301',
  offWhite: '#F3F4F6',
};

export interface ChartCompositionProps {
  data: ChartDataPoint[];
  labelA: string;
  labelB: string;
  hookText: string;
  takeawayText: string;
  highlightIndex: number;
}

// Chart dimensions with 10% padding for Reels UI
const PADDING = {
  top: 192, // 10% of 1920
  bottom: 192,
  left: 80,
  right: 80,
};

const CHART_AREA = {
  x: PADDING.left,
  y: PADDING.top + 180, // Space for hook text
  width: 1080 - PADDING.left - PADDING.right,
  height: 1920 - PADDING.top - PADDING.bottom - 360, // Space for hook + takeaway
};

function getMinMax(data: ChartDataPoint[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  data.forEach((d) => {
    // Handle nulls - only consider non-null values
    if (d.series_a !== null) {
      min = Math.min(min, d.series_a);
      max = Math.max(max, d.series_a);
    }
    if (d.series_b !== null) {
      min = Math.min(min, d.series_b);
      max = Math.max(max, d.series_b);
    }
  });
  // Handle edge case where all values are null
  if (min === Infinity) min = 0;
  if (max === -Infinity) max = 100;
  // Add 10% padding
  const range = max - min || 1;
  return { min: min - range * 0.1, max: max + range * 0.1 };
}

interface Point {
  x: number;
  y: number | null; // null = gap in line
}

function dataToPoints(
  data: ChartDataPoint[],
  series: 'series_a' | 'series_b',
  minMax: { min: number; max: number }
): Point[] {
  return data.map((d, i) => {
    const val = d[series];
    return {
      x: CHART_AREA.x + (i / Math.max(data.length - 1, 1)) * CHART_AREA.width,
      y: val === null 
        ? null 
        : CHART_AREA.y + CHART_AREA.height - ((val - minMax.min) / (minMax.max - minMax.min)) * CHART_AREA.height,
    };
  });
}

// Generate path segments (breaks at nulls to create gaps)
function pointsToPathSegments(points: Point[]): string[] {
  const segments: string[] = [];
  let currentSegment: string[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.y === null) {
      // End current segment if exists
      if (currentSegment.length > 0) {
        segments.push(currentSegment.join(' '));
        currentSegment = [];
      }
    } else {
      if (currentSegment.length === 0) {
        currentSegment.push(`M ${p.x} ${p.y}`);
      } else {
        currentSegment.push(`L ${p.x} ${p.y}`);
      }
    }
  }
  
  // Don't forget last segment
  if (currentSegment.length > 0) {
    segments.push(currentSegment.join(' '));
  }
  
  return segments;
}

export const ChartComposition: React.FC<ChartCompositionProps> = ({
  data,
  labelA,
  labelB,
  hookText,
  takeawayText,
  highlightIndex,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline phases (15s = 450 frames at 30fps)
  const hookEnd = 1.5 * fps; // 45 frames
  const strokeEnd = 12.5 * fps; // 375 frames
  const freezeStart = strokeEnd;

  // Calculate min/max for scaling
  const minMax = getMinMax(data);

  // Generate line points
  const pointsA = dataToPoints(data, 'series_a', minMax);
  const pointsB = dataToPoints(data, 'series_b', minMax);

  // Hook text animation (fade in 0-1.5s)
  const hookOpacity = interpolate(frame, [0, hookEnd], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Stroke reveal progress (1.5s - 12.5s)
  const strokeProgress = interpolate(
    frame,
    [hookEnd, strokeEnd],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }
  );

  // How many points to show
  const visiblePoints = Math.ceil(strokeProgress * data.length);

  // Current visible path segments (handles gaps)
  const visibleSegmentsA = pointsToPathSegments(pointsA.slice(0, visiblePoints));
  const visibleSegmentsB = pointsToPathSegments(pointsB.slice(0, visiblePoints));

  // Moving dot position (find last non-null point)
  const currentIdx = Math.min(visiblePoints - 1, data.length - 1);
  let dotA: { x: number; y: number } | null = null;
  let dotB: { x: number; y: number } | null = null;
  
  // Find last visible non-null point for dot
  for (let i = currentIdx; i >= 0; i--) {
    if (!dotA && pointsA[i].y !== null) {
      dotA = { x: pointsA[i].x, y: pointsA[i].y! };
    }
    if (!dotB && pointsB[i].y !== null) {
      dotB = { x: pointsB[i].x, y: pointsB[i].y! };
    }
    if (dotA && dotB) break;
  }

  // Highlight animation (starts at freeze)
  const highlightOpacity = interpolate(
    frame,
    [freezeStart, freezeStart + 15],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Takeaway text animation
  const takeawayOpacity = interpolate(
    frame,
    [freezeStart + 10, freezeStart + 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Calculate delta for display (find first and last non-null values)
  const calcDelta = (series: 'series_a' | 'series_b'): string => {
    let first: number | null = null;
    let last: number | null = null;
    for (const point of data) {
      const val = point[series];
      if (val !== null) {
        if (first === null) first = val;
        last = val;
      }
    }
    if (first === null || last === null || first === 0) return '0';
    return (((last - first) / first) * 100).toFixed(1);
  };
  
  const deltaA = calcDelta('series_a');
  const deltaB = calcDelta('series_b');

  // Highlight point position (only if non-null)
  const highlightPointA = pointsA[highlightIndex]?.y !== null ? pointsA[highlightIndex] : null;
  const highlightPointB = pointsB[highlightIndex]?.y !== null ? pointsB[highlightIndex] : null;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.offWhite }}>
      {/* Hook Text */}
      <div
        style={{
          position: 'absolute',
          top: PADDING.top,
          left: PADDING.left,
          right: PADDING.right,
          opacity: hookOpacity,
        }}
      >
        <h1
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 56,
            fontWeight: 800,
            color: COLORS.darkNavy,
            lineHeight: 1.2,
            textAlign: 'center',
          }}
        >
          {hookText}
        </h1>
      </div>

      {/* SVG Chart */}
      <svg
        width="1080"
        height="1920"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={CHART_AREA.x}
            y1={CHART_AREA.y + CHART_AREA.height * ratio}
            x2={CHART_AREA.x + CHART_AREA.width}
            y2={CHART_AREA.y + CHART_AREA.height * ratio}
            stroke="#E5E7EB"
            strokeWidth={2}
          />
        ))}

        {/* Line A (Blue) - multiple segments for gaps */}
        {visibleSegmentsA.map((segment, i) => (
          <path
            key={`a-${i}`}
            d={segment}
            fill="none"
            stroke={COLORS.primaryBlue}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Line B (Teal) - multiple segments for gaps */}
        {visibleSegmentsB.map((segment, i) => (
          <path
            key={`b-${i}`}
            d={segment}
            fill="none"
            stroke={COLORS.accentTeal}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Moving dots (only if we have valid positions) */}
        {visiblePoints > 0 && dotA && (
          <circle
            cx={dotA.x}
            cy={dotA.y}
            r={12}
            fill={COLORS.primaryBlue}
          />
        )}
        {visiblePoints > 0 && dotB && (
          <circle
            cx={dotB.x}
            cy={dotB.y}
            r={12}
            fill={COLORS.accentTeal}
          />
        )}

        {/* Highlight at special point (only if non-null) */}
        {frame >= freezeStart && highlightPointA && highlightPointA.y !== null && (
          <circle
            cx={highlightPointA.x}
            cy={highlightPointA.y}
            r={20}
            fill="none"
            stroke={COLORS.goldAccent}
            strokeWidth={4}
            opacity={highlightOpacity}
          />
        )}
        {frame >= freezeStart && highlightPointB && highlightPointB.y !== null && (
          <circle
            cx={highlightPointB.x}
            cy={highlightPointB.y}
            r={20}
            fill="none"
            stroke={COLORS.goldAccent}
            strokeWidth={4}
            opacity={highlightOpacity}
          />
        )}
      </svg>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          top: CHART_AREA.y - 50,
          left: PADDING.left,
          display: 'flex',
          gap: 40,
          opacity: hookOpacity,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: COLORS.primaryBlue,
            }}
          />
          <span
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 28,
              fontWeight: 600,
              color: COLORS.darkNavy,
            }}
          >
            {labelA}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: COLORS.accentTeal,
            }}
          />
          <span
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 28,
              fontWeight: 600,
              color: COLORS.darkNavy,
            }}
          >
            {labelB}
          </span>
        </div>
      </div>

      {/* Delta display (at freeze) */}
      {frame >= freezeStart && (
        <div
          style={{
            position: 'absolute',
            bottom: PADDING.bottom + 200,
            left: PADDING.left,
            right: PADDING.right,
            display: 'flex',
            justifyContent: 'center',
            gap: 60,
            opacity: highlightOpacity,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 48,
                fontWeight: 800,
                color: COLORS.primaryBlue,
              }}
            >
              {Number(deltaA) >= 0 ? '+' : ''}{deltaA}%
            </div>
            <div
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 24,
                color: COLORS.darkNavy,
              }}
            >
              {labelA}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 48,
                fontWeight: 800,
                color: COLORS.accentTeal,
              }}
            >
              {Number(deltaB) >= 0 ? '+' : ''}{deltaB}%
            </div>
            <div
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 24,
                color: COLORS.darkNavy,
              }}
            >
              {labelB}
            </div>
          </div>
        </div>
      )}

      {/* Takeaway text */}
      {takeawayText && (
        <div
          style={{
            position: 'absolute',
            bottom: PADDING.bottom + 40,
            left: PADDING.left,
            right: PADDING.right,
            opacity: takeawayOpacity,
          }}
        >
          <p
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 36,
              fontWeight: 500,
              color: COLORS.darkNavy,
              textAlign: 'center',
            }}
          >
            {takeawayText}
          </p>
        </div>
      )}
    </AbsoluteFill>
  );
};

export default ChartComposition;
