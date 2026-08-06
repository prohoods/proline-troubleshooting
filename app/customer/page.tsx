import {
  CustomerFlowPage,
  type PageSearchParams,
} from "@/components/layout/CustomerFlowPage";

// Direct-access alias for internal QA on the app's own domain. Customers reach
// the flow at /tools/troubleshoot, which is what the storefront proxies to.
export const dynamic = "force-dynamic";

export default async function CustomerHome({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  return <CustomerFlowPage searchParams={searchParams} />;
}
