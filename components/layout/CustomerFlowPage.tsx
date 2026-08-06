import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Troubleshooter } from "@/components/questionnaire/Troubleshooter";
import { proxyRequestAllowed } from "@/lib/shopify/appProxy";

export type PageSearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

/**
 * The customer-facing flow, shared by every route that serves it.
 *
 * It is mounted at BOTH `/tools/troubleshoot` (the path the storefront proxies,
 * so the App Router's route matches the browser's address bar — otherwise Next
 * rewrites the URL on hydration and a refresh 404s on the storefront) and
 * `/customer` (kept for direct QA on the app's own domain).
 */
export async function CustomerFlowPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  // Rebuild the query Shopify signed so the HMAC can be checked. The host is
  // irrelevant to the signature — only the query params are signed.
  const params = await searchParams;
  const url = new URL("https://proline.invalid/customer");
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) {
      url.searchParams.append(key, v);
    }
  }

  // A request presenting a signature must present a valid one. Unsigned
  // requests (direct app access) still pass — the flow is public by design.
  if (!proxyRequestAllowed(url)) notFound();

  return (
    <AppShell mode="customer">
      <Troubleshooter mode="customer" />
    </AppShell>
  );
}
