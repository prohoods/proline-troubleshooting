"use client";

import { useState } from "react";
import { Logo } from "./Logo";

// Official logo uploaded to public/brand/. Falls back to the in-app Montserrat
// lockup if the image ever fails to load.
const LOGO_SRC = "/brand/Proline_Kitchen_Appliances-blk.png";

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
