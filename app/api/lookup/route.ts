import { NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/cors";
import { ShopifyError, shopifyConfigured } from "@/lib/shopify/client";
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

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return withCors(
      NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 }),
      request,
    );
  }

  // Not configured yet (no env vars) — let the UI show a clear message.
  if (!shopifyConfigured()) {
    return withCors(
      NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 }),
      request,
    );
  }

  let identifier = "";
  try {
    const body = (await request.json()) as { identifier?: unknown };
    if (typeof body.identifier === "string") identifier = body.identifier;
  } catch {
    return withCors(
      NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 }),
      request,
    );
  }

  if (!identifier.trim()) {
    return withCors(
      NextResponse.json({ ok: false, error: "missing_identifier" }, { status: 400 }),
      request,
    );
  }

  try {
    const orders = await lookupOrders(identifier);
    return withCors(NextResponse.json({ ok: true, orders }), request);
  } catch (e) {
    // Log the detail server-side (Vercel logs); return a generic error to clients
    // so the host/version/error text isn't exposed publicly.
    const detail = e instanceof ShopifyError ? e.code : "network";
    const message = e instanceof Error ? e.message : String(e);
    console.error("[lookup] failed:", detail, message);
    return withCors(
      NextResponse.json({ ok: false, error: "upstream" }, { status: 502 }),
      request,
    );
  }
}
