'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { ColumnMapping } from '@/lib/csv-parser';

interface ColumnMapperProps {
  headers: string[];
  onMappingConfirm: (mapping: ColumnMapping) => void;
}

export function ColumnMapper({ headers, onMappingConfirm }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: '',
    series_a: '',
    series_b: '',
  });

  // Auto-detect columns on mount
  useEffect(() => {
    const dateCol = headers.find((h) =>
      /date|time|month|year|period/i.test(h)
    ) || headers[0];
    
    const seriesACandidates = headers.filter((h) =>
      /series_a|line_a|value_a|a$/i.test(h)
    );
    const seriesBCandidates = headers.filter((h) =>
      /series_b|line_b|value_b|b$/i.test(h)
    );

    const nonDateHeaders = headers.filter((h) => h !== dateCol);
    
    setMapping({
      date: dateCol || '',
      series_a: seriesACandidates[0] || nonDateHeaders[0] || '',
      series_b: seriesBCandidates[0] || nonDateHeaders[1] || '',
    });
  }, [headers]);

  const isValid = mapping.date && mapping.series_a && mapping.series_b &&
    mapping.date !== mapping.series_a &&
    mapping.date !== mapping.series_b &&
    mapping.series_a !== mapping.series_b;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-dark-navy">2. Map Columns</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Date Column</Label>
          <Select
            value={mapping.date}
            onValueChange={(value) =>
              setMapping((m) => ({ ...m, date: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select date column" />
            </SelectTrigger>
            <SelectContent>
              {headers.map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>
            Series A Column <span className="text-primary-blue">(Blue line)</span>
          </Label>
          <Select
            value={mapping.series_a}
            onValueChange={(value) =>
              setMapping((m) => ({ ...m, series_a: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select series A column" />
            </SelectTrigger>
            <SelectContent>
              {headers.map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>
            Series B Column <span className="text-accent-teal">(Teal line)</span>
          </Label>
          <Select
            value={mapping.series_b}
            onValueChange={(value) =>
              setMapping((m) => ({ ...m, series_b: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select series B column" />
            </SelectTrigger>
            <SelectContent>
              {headers.map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => onMappingConfirm(mapping)}
          disabled={!isValid}
          className="w-full bg-accent-teal hover:bg-accent-teal/90"
        >
          Confirm Mapping
        </Button>
      </CardContent>
    </Card>
  );
}
