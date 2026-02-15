# Reel Chart Generator - Limits & Specs

## Deployment
- **UI + Preview:** https://reel-chart-generator.vercel.app
- **Server-side render:** Not available (requires Remotion Lambda or local CLI)
- **GitHub:** https://github.com/rojasjuniore/reel-chart-generator

## Video Output
- **Resolution:** 1080x1920 (9:16 vertical)
- **FPS:** 30
- **Duration:** 15 seconds
- **Codec:** H.264
- **Typical size:** 700KB - 1.5MB

## Input Limits
- **Max file size:** 1MB
- **Max data points:** 500 rows
- **Supported formats:** CSV (date, series_a, series_b)

## Performance
- **Render time:** ~15-25 seconds per export
- **Concurrent exports:** 1 at a time (queue max 3)
- **Timeout:** 120 seconds
- **Backpressure:** Returns 429 if queue > 3

## Data Handling
- **Missing values:** Show as gaps in line (not skipped)
- **Unordered dates:** Auto-sorted ascending
- **Duplicate dates:** Last-write-wins
- **Large datasets:** Auto-downsampled to 120 points

## Endpoints
- `GET /api/health` - Health check (no Remotion)
- `GET /api/status` - Queue status + specs
- `POST /api/render` - Generate video

## Safe Margins
- Top/bottom padding: 10% (192px) for Reels UI
- If clipping occurs: adjust to 12-14%

## Sample Request
```bash
curl -X POST https://YOUR-URL/api/render \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {"date": "2024-01", "series_a": 100, "series_b": 95, "timestamp": 1704067200000},
      {"date": "2024-02", "series_a": 108, "series_b": 102, "timestamp": 1706745600000}
    ],
    "labelA": "Revenue",
    "labelB": "Costs",
    "hookText": "Revenue vs Costs",
    "takeawayText": "Strong growth"
  }' --output video.mp4
```
