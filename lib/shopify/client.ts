// Minimal server-side Shopify Admin GraphQL client.
//
// Reads credentials from env at call time (never bundled to the client). All
// access goes through here so the rest of the app stays decoupled from Shopify.

const DEFAULT_API_VERSION = "2026-04";

export class ShopifyError extends Error {
  constructor(
    public code: "not_configured" | "upstream" | "graphql",
    message: string,
  ) {
    super(message);
    this.name = "ShopifyError";
  }
}

/** True when the Shopify env vars are present (lets routes 503 cleanly if not). */
export function shopifyConfigured(): boolean {
  return Boolean(
    process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
  );
}

export async function shopifyGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION || DEFAULT_API_VERSION;

  if (!domain || !token) {
    throw new ShopifyError("not_configured", "Shopify credentials are not set");
  }

  const res = await fetch(
    `https://${domain}/admin/api/${version}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new ShopifyError("upstream", `Shopify HTTP ${res.status}`);
  }

  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors) {
    throw new ShopifyError("graphql", JSON.stringify(json.errors));
  }
  return json.data as T;
}
