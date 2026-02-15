import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { ChartComposition, type ChartCompositionProps } from '../components/remotion/chart-composition';

// Default props for Remotion Studio preview
const defaultProps: ChartCompositionProps = {
  data: [
    { date: '2024-01', series_a: 100, series_b: 120, timestamp: 1704067200000 },
    { date: '2024-02', series_a: 150, series_b: 130, timestamp: 1706745600000 },
    { date: '2024-03', series_a: 180, series_b: 160, timestamp: 1709251200000 },
    { date: '2024-04', series_a: 220, series_b: 200, timestamp: 1711929600000 },
    { date: '2024-05', series_a: 250, series_b: 280, timestamp: 1714521600000 },
  ],
  labelA: 'Series A',
  labelB: 'Series B',
  hookText: 'Two metrics compared over time',
  takeawayText: 'Both series show strong growth in 2024',
  highlightIndex: 4,
};

// Wrapper component to satisfy Remotion's type requirements
const ChartCompositionWrapper: React.FC<Record<string, unknown>> = (props) => {
  return <ChartComposition {...(props as unknown as ChartCompositionProps)} />;
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReelChart"
        component={ChartCompositionWrapper}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />
    </>
  );
};

// Register the root component for Remotion
registerRoot(RemotionRoot);
