// The storefront-facing entry point.
//
// Shopify's App Proxy maps prolinerangehoods.com/tools/troubleshoot here. We
// answer with Content-Type: application/liquid, which makes Shopify render the
// body inside the live theme — between the real header and footer, on the real
// URL. So this returns an HTML *fragment*, not a document: the theme owns
// <html>, <head>, and <body>.
//
// The flow itself ships as a self-contained widget bundle that mounts into a
// shadow root (see widget/main.tsx), which seals our Tailwind CSS off from the
// theme. That isolation is required, not defensive: the Proline theme uses
// `hidden`, `block`, `flex`, and `grid` as its own class names, and Tailwind
// defines all four — a global stylesheet would override the theme's grids.
//
// The standalone Next page at /customer still renders the same flow with our
// own chrome, for QA on this app's domain.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Montserrat:wght@100..900&display=swap";

export function GET() {
  // Absolute so the browser fetches the bundle from this app, not from the
  // storefront origin the page is being served on.
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim().replace(/\/$/, "");
  const src = `${origin ?? ""}/widget/troubleshooter.js`;

  const body = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT_HREF}">
<div id="proline-troubleshooter"></div>
<script src="${src}" defer></script>
`;

  return new Response(body, {
    status: 200,
    headers: {
      // The signal that makes Shopify render this inside the theme.
      "Content-Type": "application/liquid; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
