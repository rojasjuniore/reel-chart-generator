'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { parseCSV, type ParsedCSV } from '@/lib/csv-parser';

interface CSVUploadProps {
  onDataParsed: (data: ParsedCSV) => void;
}

export function CSVUpload({ onDataParsed }: CSVUploadProps) {
  const [csvText, setCSVText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleParse = useCallback(() => {
    if (!csvText.trim()) {
      setErrors(['Please enter or upload CSV data']);
      return;
    }

    const result = parseCSV(csvText);
    
    if (result.headers.length < 3) {
      setErrors(['CSV must have at least 3 columns (date, series_a, series_b)']);
      return;
    }

    if (result.data.length === 0) {
      setErrors(['No valid data rows found']);
      return;
    }

    setErrors(result.errors);
    onDataParsed(result);
  }, [csvText, onDataParsed]);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCSVText(text);
      setErrors([]);
    };
    reader.onerror = () => {
      setErrors(['Failed to read file']);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      handleFileUpload(file);
    } else {
      setErrors(['Please upload a CSV file']);
    }
  }, [handleFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-dark-navy">1. Upload Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging
              ? 'border-primary-blue bg-primary-blue/5'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer text-gray-600"
          >
            <div className="text-3xl mb-2">📂</div>
            <p>Drag & drop a CSV file here, or click to browse</p>
          </label>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or paste CSV</span>
          </div>
        </div>

        <div>
          <Label htmlFor="csv-text">CSV Data</Label>
          <Textarea
            id="csv-text"
            placeholder="date,series_a,series_b&#10;2024-01,100,120&#10;2024-02,110,115&#10;..."
            value={csvText}
            onChange={(e) => {
              setCSVText(e.target.value);
              setErrors([]);
            }}
            className="font-mono text-sm h-40"
          />
        </div>

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 font-medium text-sm">Errors:</p>
            <ul className="list-disc list-inside text-red-600 text-sm">
              {errors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {errors.length > 5 && (
                <li>...and {errors.length - 5} more errors</li>
              )}
            </ul>
          </div>
        )}

        <Button
          onClick={handleParse}
          className="w-full bg-primary-blue hover:bg-primary-blue/90"
        >
          Parse CSV
        </Button>
      </CardContent>
    </Card>
  );
}
