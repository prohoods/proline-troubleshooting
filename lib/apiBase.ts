/**
 * Where the browser should send API calls.
 *
 * When the flow is served through the Shopify App Proxy the page's origin is
 * the storefront (prolinerangehoods.com), but our API routes live on the app's
 * own origin. Two documented App Proxy problems make routing API traffic back
 * through the proxy a bad idea:
 *
 *   1. POST multipart/form-data through the proxy is unreliable (photo uploads).
 *   2. The proxy's request timeout is undocumented, and the support submission
 *      runs an AI pre-diagnosis that can take ~25s.
 *
 * So the HTML is proxied (the customer sees the Proline domain) while fetches
 * go straight to the app origin, which allows them via CORS.
 *
 * NEXT_PUBLIC_APP_ORIGIN is the app's own absolute origin, e.g.
 * "https://troubleshooting.prolinerangehoods.com". Unset (local dev, or direct
 * Vercel access) → same-origin relative paths.
 */
export function apiUrl(path: string): string {
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim().replace(/\/$/, "");
  if (!origin) return path;

  // Already same-origin (someone opened the Vercel URL directly) — keep it
  // relative so cookies and dev tooling behave normally.
  if (
    typeof window !== "undefined" &&
    window.location.origin.toLowerCase() === origin.toLowerCase()
  ) {
    return path;
  }
  return `${origin}${path}`;
}
