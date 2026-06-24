import { NextResponse } from "next/server";
import { shopifyConfigured } from "@/lib/shopify/client";
import { lookupOrders } from "@/lib/shopify/lookup";

// Server-side Shopify order lookup for the questionnaire's first step.
export const runtime = "nodejs";

// Best-effort in-memory rate limit. Per serverless instance (not global), so it
// blunts casual abuse rather than guaranteeing a hard cap — swap for Vercel KV /
// Upstash ratelimit if stronger guarantees are needed.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 15;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 },
    );
  }

  // Not configured yet (no env vars) — let the UI show a clear message.
  if (!shopifyConfigured()) {
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 503 },
    );
  }

  let identifier = "";
  try {
    const body = (await request.json()) as { identifier?: unknown };
    if (typeof body.identifier === "string") identifier = body.identifier;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  if (!identifier.trim()) {
    return NextResponse.json(
      { ok: false, error: "missing_identifier" },
      { status: 400 },
    );
  }

  try {
    const orders = await lookupOrders(identifier);
    return NextResponse.json({ ok: true, orders });
  } catch {
    // Shopify unreachable / token invalid — generic upstream error (no detail leak).
    return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  }
}
