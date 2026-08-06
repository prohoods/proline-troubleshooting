import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Troubleshooter } from "@/components/questionnaire/Troubleshooter";
import { proxyRequestAllowed } from "@/lib/shopify/appProxy";

// Customer-facing self-service flow. Served to shoppers through the Shopify
// App Proxy at prolinerangehoods.com/tools/troubleshoot, and directly on this
// app's own URL for internal testing. Scripted diagnoses only — the AI runs at
// case-submit time and is visible to the agent in Stopgap, never to the
// customer.
//
// Dynamic because a proxied request carries a signature we verify per-request.
export const dynamic = "force-dynamic";

export default async function CustomerHome({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
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
  // requests (direct Vercel access) still pass — the flow is public by design.
  if (!proxyRequestAllowed(url)) notFound();

  return (
    <AppShell mode="customer">
      <Troubleshooter mode="customer" />
    </AppShell>
  );
}
