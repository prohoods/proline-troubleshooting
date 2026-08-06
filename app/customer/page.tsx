import { AppShell } from "@/components/layout/AppShell";
import { Troubleshooter } from "@/components/questionnaire/Troubleshooter";

// Customer-facing self-service flow — served to shoppers via the storefront
// (Shopify App Proxy). Scripted diagnoses only; no AI shown to the customer.
export default function CustomerHome() {
  return (
    <AppShell mode="customer">
      <Troubleshooter mode="customer" />
    </AppShell>
  );
}
