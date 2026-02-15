import Papa from 'papaparse';

export interface ChartDataPoint {
  date: string;
  series_a: number | null;
  series_b: number | null;
  timestamp: number; // for sorting
}

export interface ParsedCSV {
  headers: string[];
  data: Record<string, string | number>[];
  errors: string[];
}

export interface ColumnMapping {
  date: string;
  series_a: string;
  series_b: string;
}

export interface ValidationOptions {
  interpolate?: boolean; // OFF by default
  maxInterpolateGap?: number; // max consecutive nulls to interpolate
}

// File size limit: 1MB
export const MAX_FILE_SIZE = 1_000_000;

export function parseCSV(csvText: string): ParsedCSV {
  // Check file size limit
  if (csvText.length > MAX_FILE_SIZE) {
    return {
      headers: [],
      data: [],
      errors: [`File too large: ${(csvText.length / 1_000_000).toFixed(2)}MB exceeds 1MB limit`],
    };
  }

  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const errors: string[] = [];
  
  if (result.errors.length > 0) {
    result.errors.forEach((err) => {
      errors.push(`Row ${err.row}: ${err.message}`);
    });
  }

  const headers = result.meta.fields || [];
  const data = result.data as Record<string, string | number>[];

  return { headers, data, errors };
}

function parseDate(dateVal: unknown): { timestamp: number; dateStr: string } | null {
  if (!dateVal || dateVal === '') return null;
  
  const dateStr = String(dateVal);
  const timestamp = new Date(dateStr).getTime();
  
  if (isNaN(timestamp)) return null;
  
  return { timestamp, dateStr };
}

function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '' || val === 'NaN') {
    return null;
  }
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(num) ? null : num;
}

export function validateAndMapData(
  data: Record<string, string | number>[],
  mapping: ColumnMapping,
  options: ValidationOptions = {}
): { valid: ChartDataPoint[]; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dateMap = new Map<number, ChartDataPoint>(); // for dedupe (last-write-wins)

  data.forEach((row, index) => {
    const dateVal = row[mapping.date];
    const aVal = row[mapping.series_a];
    const bVal = row[mapping.series_b];

    // Parse and validate date (REQUIRED)
    const parsedDate = parseDate(dateVal);
    if (!parsedDate) {
      errors.push(`Row ${index + 1}: Invalid or missing date "${dateVal}"`);
      return;
    }

    // Parse values (allow null for gaps)
    const seriesA = parseNumber(aVal);
    const seriesB = parseNumber(bVal);

    // Warn about nulls but DON'T skip
    if (seriesA === null) {
      warnings.push(`Row ${index + 1}: Missing series_a value (will show gap)`);
    }
    if (seriesB === null) {
      warnings.push(`Row ${index + 1}: Missing series_b value (will show gap)`);
    }

    const point: ChartDataPoint = {
      date: parsedDate.dateStr,
      series_a: seriesA,
      series_b: seriesB,
      timestamp: parsedDate.timestamp,
    };

    // Dedupe: last-write-wins
    if (dateMap.has(parsedDate.timestamp)) {
      warnings.push(`Row ${index + 1}: Duplicate date "${parsedDate.dateStr}" (using last value)`);
    }
    dateMap.set(parsedDate.timestamp, point);
  });

  // Convert to array and sort by timestamp ASC
  let valid = Array.from(dateMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  // Optional: linear interpolation
  if (options.interpolate && options.maxInterpolateGap) {
    valid = interpolateGaps(valid, options.maxInterpolateGap);
  }

  // Downsample if > 120 points
  const maxPoints = 120;
  if (valid.length > maxPoints) {
    const step = Math.ceil(valid.length / maxPoints);
    valid = valid.filter((_, i) => i % step === 0);
    warnings.push(`Downsampled from ${dateMap.size} to ${valid.length} points`);
  }

  return { valid, errors, warnings };
}

function interpolateGaps(data: ChartDataPoint[], maxGap: number): ChartDataPoint[] {
  const result = [...data];
  
  for (const series of ['series_a', 'series_b'] as const) {
    let gapStart = -1;
    
    for (let i = 0; i < result.length; i++) {
      if (result[i][series] === null) {
        if (gapStart === -1) gapStart = i;
      } else {
        if (gapStart !== -1) {
          const gapLength = i - gapStart;
          if (gapLength <= maxGap && gapStart > 0) {
            // Interpolate
            const startVal = result[gapStart - 1][series]!;
            const endVal = result[i][series]!;
            for (let j = gapStart; j < i; j++) {
              const ratio = (j - gapStart + 1) / (gapLength + 1);
              result[j] = {
                ...result[j],
                [series]: startVal + (endVal - startVal) * ratio,
              };
            }
          }
          gapStart = -1;
        }
      }
    }
  }
  
  return result;
}

export function findHighlightPoint(data: ChartDataPoint[]): number {
  if (data.length === 0) return 0;

  let maxGapIndex = 0;
  let maxGap = 0;
  let crossingIndex = -1;

  for (let i = 0; i < data.length; i++) {
    const a = data[i].series_a;
    const b = data[i].series_b;
    
    // Skip if either is null
    if (a === null || b === null) continue;
    
    const gap = Math.abs(a - b);
    if (gap > maxGap) {
      maxGap = gap;
      maxGapIndex = i;
    }

    // Check for crossing
    if (i > 0) {
      const prevA = data[i - 1].series_a;
      const prevB = data[i - 1].series_b;
      if (prevA !== null && prevB !== null) {
        const prevDiff = prevA - prevB;
        const currDiff = a - b;
        if (prevDiff * currDiff < 0) {
          crossingIndex = i;
        }
      }
    }
  }

  return crossingIndex >= 0 ? crossingIndex : maxGapIndex;
}

export function calculateDelta(data: ChartDataPoint[]): {
  deltaA: number;
  deltaB: number;
  percentA: number;
  percentB: number;
} {
  if (data.length < 2) {
    return { deltaA: 0, deltaB: 0, percentA: 0, percentB: 0 };
  }

  // Find first and last non-null values
  let firstA: number | null = null;
  let lastA: number | null = null;
  let firstB: number | null = null;
  let lastB: number | null = null;

  for (const point of data) {
    if (point.series_a !== null) {
      if (firstA === null) firstA = point.series_a;
      lastA = point.series_a;
    }
    if (point.series_b !== null) {
      if (firstB === null) firstB = point.series_b;
      lastB = point.series_b;
    }
  }

  const deltaA = (firstA !== null && lastA !== null) ? lastA - firstA : 0;
  const deltaB = (firstB !== null && lastB !== null) ? lastB - firstB : 0;
  const percentA = (firstA && firstA !== 0) ? (deltaA / firstA) * 100 : 0;
  const percentB = (firstB && firstB !== 0) ? (deltaB / firstB) * 100 : 0;

  return { deltaA, deltaB, percentA, percentB };
}
