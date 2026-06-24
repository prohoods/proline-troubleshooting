# Proline Troubleshooting Guide

A branded, step-by-step troubleshooting questionnaire for **Proline Range Hoods**.
A user picks a product, answers a branching set of questions, and lands on one or
more **likely diagnoses with suggested fixes** — then rates how well it worked.

Two audiences share one simple UX: Proline customer-service agents (diagnosing on
a call) and consumers (self-service).

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4
- **Deploy target:** Vercel (zero-config)

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (type-check + build)
npm start        # serve the production build
```

---

## The flow (source of truth)

The question tree is transcribed verbatim from the **"Proline General
Troubleshooting Questionnaire"** flow diagram. It lives as typed data — no
question text is hard-coded in the UI:

| File | What it holds |
| --- | --- |
| [`lib/flow/types.ts`](lib/flow/types.ts) | The flow model (`Question`, `Branch`, `CategoryFlow`, …) |
| [`lib/flow/rangeHoodFlow.ts`](lib/flow/rangeHoodFlow.ts) | The full Range Hood tree (Product Info → Issue Type → 7 branches) |
| [`lib/flow/engine.ts`](lib/flow/engine.ts) | Navigation: builds the ordered step list from answers, gating, progress, persistence flattening |
| [`lib/flow/index.ts`](lib/flow/index.ts) | Top-level category registry (Range Hood + Ranges placeholder) |

**Structure of the tree:** `Product Information` (order/model, hood age) →
`Issue Type` (7 categories) → a branch. Six branches are linear; **Hood
Performance / Airflow** additionally splits **Indoors vs Outdoors**. Each branch
ends in an "Additional information" node. Question types: `single`, `multi`,
`text`, `upload`. `legacyLabel` preserves the original "QUESTION N" numbering for
traceability.

To **edit the flow**, change the data in `rangeHoodFlow.ts` — the UI adapts
automatically.

---

## Diagnoses (placeholder content — drop in real copy here)

The diagram defines the *questions*, not the *diagnoses*. The diagnosis layer is
scaffolded with clearly-labeled placeholder text:

| File | What it holds |
| --- | --- |
| [`lib/diagnoses/content.ts`](lib/diagnoses/content.ts) | **PLACEHOLDER** diagnoses per branch — replace summaries, steps, parts/tools, escalation |
| [`lib/diagnoses/resolve.ts`](lib/diagnoses/resolve.ts) | `resolveDiagnoses(answers)` — maps a completed run to diagnoses (one example rule included; replace with real Proline logic) |
| [`lib/diagnoses/types.ts`](lib/diagnoses/types.ts) | `Diagnosis` shape |

Every placeholder string is prefixed `PLACEHOLDER —` and cards render a
"Placeholder content" badge until real copy lands.

---

## Data / feedback capture

Each completed run (selections + diagnoses shown + feedback) is POSTed to a single
API route, behind a **swappable storage module** so a real database plugs in later
without touching the rest of the app.

| File | What it holds |
| --- | --- |
| [`app/api/runs/route.ts`](app/api/runs/route.ts) | `POST /api/runs` — the single ingress point |
| [`lib/storage/index.ts`](lib/storage/index.ts) | The persistence **seam** — swap the adapter here |
| [`lib/storage/memory.ts`](lib/storage/memory.ts) | v1 adapter: in-memory + structured `[proline-run]` console log |
| [`lib/storage/types.ts`](lib/storage/types.ts) | `RunRecord`, `StorageAdapter` |

> **Why no JSON file?** On Vercel the filesystem is read-only and ephemeral, so a
> file wouldn't persist. v1 logs each run as a structured line (captured by Vercel
> logs) and keeps an in-memory copy. To persist for real, implement
> `StorageAdapter` (e.g. Postgres / Vercel KV / Supabase) and assign it in
> `lib/storage/index.ts` — nothing else changes.

---

## Brand

Styling follows the **Proline Brand Playbook v1.0**. Tokens are defined once in
[`app/globals.css`](app/globals.css) via Tailwind v4 `@theme`:

- **Sky Blue** `#28A5DE` (accent) · **Black** `#2B2B2B` (text) · **White** surface
  · supporting grey · **Yellow** `#FFD262` (rare highlight)
- **Montserrat** is the only typeface (loaded via `next/font`); weight is the only
  variable
- The logo ([`components/brand/Logo.tsx`](components/brand/Logo.tsx)) is the
  airflow flame (official vector) + `PROLINE` wordmark + `RANGE HOODS` subtitle;
  the flame alone is the favicon ([`app/icon.svg`](app/icon.svg))
- Tone: warm, authoritative, simple

---

## Project structure

```
app/
  layout.tsx           Montserrat, metadata
  page.tsx             AppShell + Troubleshooter
  icon.svg             flame favicon / app icon
  api/runs/route.ts    POST run capture
components/
  brand/               Flame, Logo
  layout/AppShell.tsx  header + footer chrome
  ui/                  Button, Eyebrow, ProgressBar, Icon
  questionnaire/       Troubleshooter (state machine) + screens + inputs/
lib/
  flow/                flow model, data, engine, category registry
  diagnoses/           placeholder content + resolver
  storage/             swappable persistence module
  types.ts             shared answer types
```

---

## Out of scope (v1) — seams left in place

These are intentionally **not** implemented, with clean seams so they're easy to
add later:

- **Real database** — implement `StorageAdapter` and swap it in `lib/storage/index.ts`.
- **Photo/video uploads** — the upload UI is stubbed (records filenames only). Wire
  real storage (e.g. Vercel Blob) by changing `UploadStub`'s `onChange` handler.
- **Auto-create a CS ticket** on completion — hook into `POST /api/runs` (see the
  `notifyTicketSystem` seam in `lib/storage/index.ts`).
- **"Ranges" troubleshooting flow** — the category exists as a "coming soon"
  placeholder; add its flow in `lib/flow/index.ts` once the diagram is provided.
- **Embedding into the main site** — this ships as its own standalone Vercel site.

---

## Deploy on Vercel

Push to the target repo and import it in Vercel — no configuration needed. The
build command is `next build` and the output is detected automatically.
