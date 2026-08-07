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

// Placeholder copy — swap for whatever reads best; nothing else depends on it.
const TITLE = "Range Hood Troubleshooting Guide | Proline Range Hoods";
const DESCRIPTION =
  "Diagnose your Proline range hood in about two minutes. Answer a few questions to find the most likely cause and the fix, or send the results straight to our support team.";

/**
 * FAQPage JSON-LD. Google accepts ld+json anywhere in the document, so this
 * works from the body even though we can't reach the theme's <head>. Answers
 * are deliberately generic and safe — the real guidance is behind the
 * questionnaire, and nothing here should read as a repair instruction.
 */
const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Why is my Proline range hood not turning on?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most no-power cases trace back to the breaker, a loose or unseated wiring connection at the hood, or a failed control board. Start by confirming power at the breaker, then use the Proline troubleshooting guide to narrow it down by model and symptom.",
      },
    },
    {
      "@type": "Question",
      name: "Why are the lights out on my range hood?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "If every light is out at once, the light driver is the usual cause rather than the bulbs themselves. If only some are out, the bulbs or their connections are more likely. The guide walks through the checks in order.",
      },
    },
    {
      "@type": "Question",
      name: "Why is my range hood not pulling smoke or air?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Weak extraction is usually filters, ducting, or make-up air rather than the motor. Greasy filters, long or crushed duct runs, and a sealed kitchen with no replacement air all reduce performance. The guide identifies which applies to your setup.",
      },
    },
    {
      "@type": "Question",
      name: "How do I get help if the troubleshooting steps don't fix it?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "At the end of the guide you can send your answers and photos directly to Proline support, which opens a case with everything you've already tried attached, so you don't have to repeat yourself.",
      },
    },
  ],
};

export function GET() {
  // Absolute so the browser fetches the bundle from this app, not from the
  // storefront origin the page is being served on.
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim().replace(/\/$/, "");
  const src = `${origin ?? ""}/widget/troubleshooter.js`;

  // The mount point lives in the theme's DOM, so theme CSS can style it even
  // though it can't reach inside the shadow root. Something in this theme
  // matches a bare <div> here and sets `display: none`, which collapsed the
  // whole widget to 0×0 while its shadow content rendered fine. An inline
  // declaration with !important can't be overridden by any author stylesheet.
  // SEO. An App Proxy page is not a Shopify page: no template, no theme-editor
  // sections, no admin SEO fields, and no sitemap entry. The theme's layout
  // builds <title> from template variables that don't exist here, so the page
  // shipped with NO title tag at all.
  //
  // Liquid renders this body before the layout wraps it, so variables assigned
  // here can reach the layout — whether they land depends on which names the
  // theme's <title>/<meta> markup reads. The JS fallback below is
  // unconditional, so the title is correct either way.
  const body = `{% assign page_title = '${TITLE}' %}
{% assign page_description = '${DESCRIPTION}' %}
{% assign meta_description = '${DESCRIPTION}' %}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT_HREF}">
<div id="proline-troubleshooter" style="display:block !important;visibility:visible !important;width:auto !important;height:auto !important;max-height:none !important;opacity:1 !important"></div>
<script type="application/ld+json">${JSON.stringify(FAQ_SCHEMA)}</script>
<script>
(function(){
  if (!document.title || document.title.indexOf(${JSON.stringify(TITLE)}) === -1) {
    document.title = ${JSON.stringify(TITLE)};
  }
  var m = document.querySelector('meta[name="description"]');
  if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
  if (!m.content) m.content = ${JSON.stringify(DESCRIPTION)};
})();
</script>
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
