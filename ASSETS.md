# Brand assets

All static graphics live in **`public/`** and are served at the site root
(e.g. `public/icons/ranges.svg` → `https://<site>/icons/ranges.svg`).

```
public/
  brand/                 Logos and brand marks
    proline-logo.svg       ← official header logo (drop yours here)
  icons/                 Category / UI icons
    range_hood.svg         ← "Range Hood" category icon
    ranges.svg             ← "Ranges" category icon
```

## Replacing an asset

1. Drop your file in the right folder, **keeping the same filename**.
2. Commit + push — Vercel redeploys automatically.

SVG is preferred (crisp at any size). **PNG/JPG also work** — if you use one,
just tell us the filename and we'll point the reference at it.

### Current state

- The category icons (`range_hood.svg`, `ranges.svg`) are placeholder
  reproductions — replace them with the real artwork.
- The header logo currently renders from the in-app `Logo` component
  (Montserrat). To use the **official** logo exactly, add an outlined-vector
  SVG or high-res PNG at `public/brand/proline-logo.svg` and we'll wire the
  header to render it directly (no font dependency).
