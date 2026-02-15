# Two-Line Reel Chart Generator

MVP web tool para generar videos animados de charts (2 líneas) optimizados para Instagram Reels/Stories.

## Specs

- **Output:** MP4 H.264, 1080x1920 (9:16), 30fps, ≥15s
- **Input:** CSV/paste con columnas: date, series_a, series_b
- **Animation:** Hook fade-in → stroke reveal → highlight moment → freeze + delta

## Stack

- **Frontend:** Next.js 14 + Tailwind + Shadcn
- **Video:** Remotion (composición programática)
- **Rendering:** FFmpeg (server-side para export final)

## Brand Palette

| Name | Hex |
|------|-----|
| primary_dark_navy | #0B1F3B |
| primary_blue | #1E3A8A |
| accent_teal | #00B3B8 |
| accent_cyan | #00C2E0 |
| gold_accent | #F5B301 |
| off_white | #F3F4F6 |

## Animation Timeline (15s)

```
0.0s - 1.5s   → Hook text fade in
1.5s - 12.5s  → Stroke reveal + moving dots
              → Auto-highlight: max gap OR crossing point
12.5s - 15s   → Freeze + show delta with highlight
```

## UX Flow

1. **Input:** Upload CSV or paste table
2. **Mapping:** Confirm columns + set line labels
3. **Text:** Hook (max 52 chars) + optional takeaway (max 60 chars)
4. **Style:** Pre-configured palette (Line A = blue, Line B = teal)
5. **Render:** Preview (low-res) → Export MP4 (full-res)

## Edge Cases

- Missing values: interpolate or break line (toggle)
- Different scales: shared y-axis default, toggle to normalize (index=100)
- Large datasets: downsample to max 120 points

## Output

- Filename: `{labelA}_vs_{labelB}_{YYYYMMDD}.mp4`
- Safe margins: 10% padding top/bottom for Reels UI

## Acceptance Criteria

- [ ] Upload CSV → preview works
- [ ] Export MP4 → duration ≥15s
- [ ] Correct 9:16 aspect ratio
- [ ] Smooth animation, readable text, no clipping
- [ ] Typography: modern sans, bold hook, regular axes

---

Requested by: Juan.K. (Slack #camilo-test)
Date: 2026-02-15
