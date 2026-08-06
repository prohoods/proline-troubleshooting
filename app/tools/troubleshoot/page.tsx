import {
  CustomerFlowPage,
  type PageSearchParams,
} from "@/components/layout/CustomerFlowPage";

// The canonical customer route. Shopify's App Proxy maps
// prolinerangehoods.com/tools/troubleshoot → this path, so the App Router's
// route matches the storefront URL and Next leaves the address bar alone.
//
// Dynamic because a proxied request carries a signature we verify per-request.
export const dynamic = "force-dynamic";

export default async function ToolsTroubleshoot({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  return <CustomerFlowPage searchParams={searchParams} />;
}
