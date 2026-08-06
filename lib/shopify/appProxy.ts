// Shopify App Proxy support.
//
// The storefront serves the customer flow at
// https://prolinerangehoods.com/tools/troubleshoot — Shopify forwards that
// request to this app and signs it, so we can prove it came from the store.
//
// Signature algorithm (per Shopify's docs): drop `signature`, render the
// remaining query params as `key=value` (multi-value joined with commas), sort
// them, concatenate with NO separator, HMAC-SHA256 with the app's shared
// secret, hex-encode, and compare in constant time.

import { createHmac, timingSafeEqual } from "node:crypto";

/** Query params Shopify appends to a proxied request. */
export interface ProxyContext {
  shop: string | null;
  loggedInCustomerId: string | null;
  pathPrefix: string | null;
}

export function proxySecretConfigured(): boolean {
  return Boolean(process.env.SHOPIFY_APP_PROXY_SECRET);
}

/**
 * True when the request carries a valid Shopify App Proxy signature.
 * False if unsigned, tampered with, or no secret is configured.
 */
export function verifyProxySignature(url: URL): boolean {
  const secret = process.env.SHOPIFY_APP_PROXY_SECRET;
  if (!secret) return false;

  const signature = url.searchParams.get("signature");
  if (!signature) return false;

  // Collect every param except `signature`, joining repeats with commas.
  const grouped = new Map<string, string[]>();
  for (const [key, value] of url.searchParams.entries()) {
    if (key === "signature") continue;
    const existing = grouped.get(key);
    if (existing) existing.push(value);
    else grouped.set(key, [value]);
  }

  const message = [...grouped.entries()]
    .map(([key, values]) => `${key}=${values.join(",")}`)
    .sort()
    .join("");

  const expected = createHmac("sha256", secret).update(message).digest("hex");

  // Constant-time compare — timingSafeEqual throws on length mismatch.
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Read the Shopify-supplied context off a proxied request. */
export function proxyContext(url: URL): ProxyContext {
  return {
    shop: url.searchParams.get("shop"),
    loggedInCustomerId: url.searchParams.get("logged_in_customer_id"),
    pathPrefix: url.searchParams.get("path_prefix"),
  };
}

/**
 * Whether a proxied request should be served.
 *
 * With no secret configured (local dev, direct Vercel access) we serve
 * everything — the flow is public by design. Once the secret IS configured,
 * a request that presents a `signature` must present a valid one; requests
 * with no signature at all still pass so the Vercel URL keeps working for
 * internal testing and QA.
 */
export function proxyRequestAllowed(url: URL): boolean {
  if (!proxySecretConfigured()) return true;
  if (!url.searchParams.has("signature")) return true;
  return verifyProxySignature(url);
}
