import { NextResponse } from "next/server";

// CORS for API calls made from the storefront.
//
// The customer flow's HTML is served through the Shopify App Proxy on the
// store's domain, but its fetches go straight to this app's origin (see
// lib/apiBase.ts for why). That's cross-origin, so the storefront origin has
// to be allow-listed explicitly.
//
// STOREFRONT_ORIGINS: comma-separated absolute origins, e.g.
// "https://prolinerangehoods.com,https://www.prolinerangehoods.com".
// Unset → no cross-origin access (same-origin calls are unaffected).

function allowedOrigins(): string[] {
  return (process.env.STOREFRONT_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, "").toLowerCase())
    .filter(Boolean);
}

/** The echo-back origin for this request, or null if it isn't allow-listed. */
export function corsOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const normalized = origin.trim().replace(/\/$/, "").toLowerCase();
  return allowedOrigins().includes(normalized) ? origin : null;
}

/** Apply CORS headers to a response when the caller's origin is allow-listed. */
export function withCors<T extends NextResponse>(
  response: T,
  request: Request,
): T {
  const origin = corsOrigin(request);
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  return response;
}

/** Preflight handler for routes the storefront calls cross-origin. */
export function corsPreflight(request: Request): NextResponse {
  const origin = corsOrigin(request);
  if (!origin) return new NextResponse(null, { status: 403 });

  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Max-Age", "86400");
  response.headers.set("Vary", "Origin");
  return response;
}
