import { AppShell } from "@/components/layout/AppShell";
import { Troubleshooter } from "@/components/questionnaire/Troubleshooter";

export type PageSearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

/**
 * The customer-facing flow, shared by every route that serves it.
 *
 * Mounted at BOTH `/tools/troubleshoot` (the path the storefront proxies, so
 * the App Router's route matches the browser's address bar — otherwise Next
 * rewrites the URL on hydration and a refresh 404s on the storefront) and
 * `/customer` (kept for direct QA on the app's own domain).
 *
 * Deliberately NOT gated on the App Proxy signature. The page is public
 * support content — no customer data, no secrets — so verifying it buys no
 * security, and it actively breaks: Next syncs Shopify's signed params into
 * the address bar on hydration, so a refresh re-sends them, Shopify appends
 * its own on top, and the duplicated params fail the HMAC. Signature
 * verification belongs on anything that returns real data, not here.
 */
export async function CustomerFlowPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  // Awaited so the route stays dynamic per-request, matching the proxy's
  // per-request query string.
  await searchParams;

  return (
    <AppShell mode="customer">
      <Troubleshooter mode="customer" />
    </AppShell>
  );
}
