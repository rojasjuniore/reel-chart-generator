'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export interface TextConfig {
  labelA: string;
  labelB: string;
  hookText: string;
  takeawayText: string;
}

interface TextConfigProps {
  defaultLabelA?: string;
  defaultLabelB?: string;
  onConfigConfirm: (config: TextConfig) => void;
}

const MAX_HOOK = 52;
const MAX_TAKEAWAY = 60;

export function TextConfigPanel({ defaultLabelA, defaultLabelB, onConfigConfirm }: TextConfigProps) {
  const [config, setConfig] = useState<TextConfig>({
    labelA: defaultLabelA || 'Line A',
    labelB: defaultLabelB || 'Line B',
    hookText: '',
    takeawayText: '',
  });

  useEffect(() => {
    if (defaultLabelA) setConfig((c) => ({ ...c, labelA: defaultLabelA }));
    if (defaultLabelB) setConfig((c) => ({ ...c, labelB: defaultLabelB }));
  }, [defaultLabelA, defaultLabelB]);

  const hookRemaining = MAX_HOOK - config.hookText.length;
  const takeawayRemaining = MAX_TAKEAWAY - config.takeawayText.length;

  const isValid = config.labelA.trim() && config.labelB.trim() && config.hookText.trim();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-dark-navy">3. Configure Labels & Text</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="label-a">
              Line A Label <span className="text-primary-blue">●</span>
            </Label>
            <Input
              id="label-a"
              value={config.labelA}
              onChange={(e) =>
                setConfig((c) => ({ ...c, labelA: e.target.value }))
              }
              placeholder="e.g., Revenue"
            />
          </div>
          <div>
            <Label htmlFor="label-b">
              Line B Label <span className="text-accent-teal">●</span>
            </Label>
            <Input
              id="label-b"
              value={config.labelB}
              onChange={(e) =>
                setConfig((c) => ({ ...c, labelB: e.target.value }))
              }
              placeholder="e.g., Expenses"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="hook-text">
            Hook Text (appears at start)
            <span className={`ml-2 text-sm ${hookRemaining < 0 ? 'text-red-500' : 'text-gray-500'}`}>
              {hookRemaining} chars left
            </span>
          </Label>
          <Textarea
            id="hook-text"
            value={config.hookText}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                hookText: e.target.value.slice(0, MAX_HOOK + 10),
              }))
            }
            placeholder="e.g., Here's why revenue is outpacing expenses..."
            className={`h-20 ${hookRemaining < 0 ? 'border-red-500' : ''}`}
          />
        </div>

        <div>
          <Label htmlFor="takeaway-text">
            Takeaway Text (optional, appears at end)
            <span className={`ml-2 text-sm ${takeawayRemaining < 0 ? 'text-red-500' : 'text-gray-500'}`}>
              {takeawayRemaining} chars left
            </span>
          </Label>
          <Textarea
            id="takeaway-text"
            value={config.takeawayText}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                takeawayText: e.target.value.slice(0, MAX_TAKEAWAY + 10),
              }))
            }
            placeholder="e.g., Revenue grew 2x faster than costs"
            className={`h-20 ${takeawayRemaining < 0 ? 'border-red-500' : ''}`}
          />
        </div>

        <Button
          onClick={() => onConfigConfirm(config)}
          disabled={!isValid || hookRemaining < 0 || takeawayRemaining < 0}
          className="w-full bg-gold-accent hover:bg-gold-accent/90 text-dark-navy font-semibold"
        >
          Generate Preview
        </Button>
      </CardContent>
    </Card>
  );
}
