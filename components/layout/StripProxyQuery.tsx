"use client";

import { useEffect } from "react";

/**
 * Removes Shopify's App Proxy query params from the address bar after hydration.
 *
 * Shopify appends shop/logged_in_customer_id/path_prefix/timestamp/signature
 * when it forwards a storefront request, and the App Router syncs the URL it
 * rendered — query included — into the address bar on hydration. Reloading then
 * re-sends those params to the storefront, and Shopify refuses to proxy a
 * request that already carries a signature (it would be a forgery vector),
 * answering with a bare 404. So every refresh broke.
 *
 * The flow keeps no state in the query string, so dropping it is safe: the
 * server already had the params it needed on the initial request.
 */
export function StripProxyQuery() {
  useEffect(() => {
    if (!window.location.search) return;
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.hash,
    );
  }, []);

  return null;
}
