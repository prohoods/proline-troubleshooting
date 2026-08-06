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
  ...(assetPrefix ? { assetPrefix } : {}),
};

export default nextConfig;
