"use client";

import { useState } from "react";
import { assetUrl } from "@/lib/apiBase";
import { Logo } from "./Logo";

// Official logo uploaded to public/brand/. Falls back to the in-app Montserrat
// lockup if the image ever fails to load. Resolved against this app's origin so
// it still loads when the flow is embedded in the storefront.
const LOGO_SRC = assetUrl("/brand/Proline_Kitchen_Appliances-blk.png");

export function HeaderLogo() {
  const [failed, setFailed] = useState(false);
  if (failed) return <Logo tone="mono" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      alt="Proline Kitchen Appliances"
      className="h-10 w-auto"
      onError={() => setFailed(true)}
    />
  );
}
