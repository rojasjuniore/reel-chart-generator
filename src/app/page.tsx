'use client';

import { useState, useCallback } from 'react';
import { CSVUpload } from '@/components/csv-upload';
import { ColumnMapper } from '@/components/column-mapper';
import { TextConfigPanel, type TextConfig } from '@/components/text-config';
import { ChartPreview } from '@/components/chart-preview';
import {
  type ParsedCSV,
  type ColumnMapping,
  type ChartDataPoint,
  validateAndMapData,
  findHighlightPoint,
} from '@/lib/csv-parser';

type Step = 'upload' | 'mapping' | 'config' | 'preview';

export default function Home() {
  const [step, setStep] = useState<Step>('upload');
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [textConfig, setTextConfig] = useState<TextConfig | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleDataParsed = useCallback((data: ParsedCSV) => {
    setParsedData(data);
    setStep('mapping');
  }, []);

  const handleMappingConfirm = useCallback(
    (mappingConfig: ColumnMapping) => {
      if (!parsedData) return;

      const { valid, errors } = validateAndMapData(parsedData.data, mappingConfig);

      if (valid.length < 2) {
        setValidationErrors([
          ...errors,
          'Need at least 2 valid data points to generate a chart',
        ]);
        return;
      }

      setMapping(mappingConfig);
      setChartData(valid);
      setHighlightIndex(findHighlightPoint(valid));
      setValidationErrors(errors);
      setStep('config');
    },
    [parsedData]
  );

  const handleConfigConfirm = useCallback((config: TextConfig) => {
    setTextConfig(config);
    setStep('preview');
  }, []);

  const handleExport = useCallback(async () => {
    if (!textConfig || chartData.length === 0) return;
    
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('Starting export...');
    setDownloadUrl(null);
    
    try {
      // Start Lambda render
      const startResponse = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: chartData,
          labelA: textConfig.labelA,
          labelB: textConfig.labelB,
          hookText: textConfig.hookText,
          takeawayText: textConfig.takeawayText,
          highlightIndex,
        }),
      });

      const startData = await startResponse.json();
      
      if (!startResponse.ok) {
        // Check if it's a configuration issue
        if (startData.configured === false) {
          throw new Error('Cloud export not configured. Contact administrator.');
        }
        throw new Error(startData.details || startData.error || 'Export failed');
      }

      const { renderId, bucketName } = startData;
      setExportStatus('Rendering in cloud...');

      // Poll for progress
      let done = false;
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes max (1 poll per second)

      while (!done && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

        const statusResponse = await fetch(
          `/api/status?renderId=${renderId}&bucketName=${bucketName}`
        );
        const statusData = await statusResponse.json();

        if (statusData.status === 'error') {
          throw new Error(statusData.error || 'Render failed');
        }

        if (statusData.status === 'done') {
          done = true;
          setExportProgress(100);
          setExportStatus('Download ready!');
          setDownloadUrl(statusData.downloadUrl);
          
          // Auto-trigger download
          if (statusData.downloadUrl) {
            const a = document.createElement('a');
            a.href = statusData.downloadUrl;
            a.download = `${textConfig.labelA}_vs_${textConfig.labelB}.mp4`.replace(/[^a-zA-Z0-9_.-]/g, '_');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        } else {
          // Update progress
          const progress = Math.round((statusData.progress || 0) * 100);
          setExportProgress(progress);
          setExportStatus(`Rendering: ${progress}% (${statusData.framesRendered || 0}/${statusData.totalFrames || 450} frames)`);
        }
      }

      if (!done) {
        throw new Error('Export timed out. Please try again.');
      }
      
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('');
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  }, [textConfig, chartData, highlightIndex]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setParsedData(null);
    setMapping(null);
    setChartData([]);
    setTextConfig(null);
    setValidationErrors([]);
  }, []);

  return (
    <main className="min-h-screen bg-off-white py-8">
      <div className="container max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-dark-navy mb-2">
            📊 Reel Chart Generator
          </h1>
          <p className="text-gray-600">
            Create animated two-line charts optimized for Instagram Reels
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {(['upload', 'mapping', 'config', 'preview'] as Step[]).map(
              (s, i) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step === s
                        ? 'bg-primary-blue text-white'
                        : i <
                          ['upload', 'mapping', 'config', 'preview'].indexOf(
                            step
                          )
                        ? 'bg-accent-teal text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 3 && (
                    <div
                      className={`w-12 h-1 ${
                        i <
                        ['upload', 'mapping', 'config', 'preview'].indexOf(step)
                          ? 'bg-accent-teal'
                          : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-700 font-medium text-sm">Warnings:</p>
            <ul className="list-disc list-inside text-yellow-600 text-sm">
              {validationErrors.slice(0, 3).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {validationErrors.length > 3 && (
                <li>...and {validationErrors.length - 3} more</li>
              )}
            </ul>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-6">
          {step === 'upload' && <CSVUpload onDataParsed={handleDataParsed} />}

          {step === 'mapping' && parsedData && (
            <>
              <ColumnMapper
                headers={parsedData.headers}
                onMappingConfirm={handleMappingConfirm}
              />
              <button
                onClick={() => setStep('upload')}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                ← Back to upload
              </button>
            </>
          )}

          {step === 'config' && mapping && (
            <>
              <TextConfigPanel
                defaultLabelA={mapping.series_a}
                defaultLabelB={mapping.series_b}
                onConfigConfirm={handleConfigConfirm}
              />
              <button
                onClick={() => setStep('mapping')}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                ← Back to column mapping
              </button>
            </>
          )}

          {step === 'preview' && textConfig && chartData.length > 0 && (
            <>
              <ChartPreview
                compositionProps={{
                  data: chartData,
                  labelA: textConfig.labelA,
                  labelB: textConfig.labelB,
                  hookText: textConfig.hookText,
                  takeawayText: textConfig.takeawayText,
                  highlightIndex,
                }}
                onExport={handleExport}
                isExporting={isExporting}
                exportProgress={exportProgress}
                exportStatus={exportStatus}
                downloadUrl={downloadUrl}
              />
              <div className="flex gap-4">
                <button
                  onClick={() => setStep('config')}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  ← Back to text config
                </button>
                <button
                  onClick={handleReset}
                  className="text-sm text-red-500 hover:text-red-700 underline"
                >
                  Start over
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-400 text-sm">
          <p>Built for Instagram Reels • 1080×1920 (9:16) • 15s duration</p>
        </footer>
      </div>
    </main>
  );
}
