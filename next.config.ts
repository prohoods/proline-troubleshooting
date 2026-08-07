import type { NextConfig } from "next";

// When the customer flow is served through the Shopify App Proxy, the page's
// origin is the storefront — so relative asset URLs like /_next/static/... would
// resolve against prolinerangehoods.com, where they don't exist. Pointing
// assetPrefix at this app's own absolute origin makes them load from here.
// Unset (local dev, direct Vercel access) → normal relative assets.
const assetPrefix = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim().replace(
  /\/$/,
  "",
);

const nextConfig: NextConfig = {
  // pdfkit ships its standard-font .afm files and must be required at runtime
  // (not bundled) so those assets resolve in the serverless function.
  serverExternalPackages: ["pdfkit"],

  // Shopify's App Proxy forwards the storefront request with a TRAILING SLASH.
  // Next's default trailing-slash normalization answers that with a 308 to a
  // relative URL, which the browser resolves against the storefront — so it
  // re-requests the storefront path carrying Shopify's signature, and Shopify
  // refuses to proxy an already-signed request with a bare 404. Serving both
  // /tools/troubleshoot and /tools/troubleshoot/ without redirecting is what
  // makes the proxy work at all.
  skipTrailingSlashRedirect: true,

  ...(assetPrefix ? { assetPrefix } : {}),
};

export default nextConfig;
