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

/**
 * Normalize SHOPIFY_STORE_DOMAIN to a bare host. Tolerates common mistakes:
 * a leading https:// (or http://), a trailing slash/path, or stray whitespace.
 * Must be the admin domain, e.g. "your-store.myshopify.com".
 */
function storeHost(): string | undefined {
  const raw = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  if (!raw) return undefined;
  return raw
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim();
}

/** True when the Shopify env vars are present (lets routes 503 cleanly if not). */
export function shopifyConfigured(): boolean {
  return Boolean(storeHost() && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
}

export async function shopifyGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const host = storeHost();
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION?.trim() || DEFAULT_API_VERSION;

  if (!host || !token) {
    throw new ShopifyError("not_configured", "Shopify credentials are not set");
  }

  const endpoint = `https://${host}/admin/api/${version}/graphql.json`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
  } catch (e) {
    throw new ShopifyError(
      "upstream",
      `network error reaching ${host} (api ${version}): ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (!res.ok) {
    throw new ShopifyError(
      "upstream",
      `Shopify HTTP ${res.status} from ${host} (api ${version})`,
    );
  }

  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors) {
    throw new ShopifyError("graphql", JSON.stringify(json.errors).slice(0, 500));
  }
  return json.data as T;
}
