import { shopifyGraphQL } from "./client";
import type { OrderSummary } from "./types";

export type { OrderProduct, OrderSummary, SelectedOrder } from "./types";

const ORDERS_QUERY = `
  query Lookup($q: String!) {
    orders(first: 10, query: $q, sortKey: PROCESSED_AT, reverse: true) {
      edges {
        node {
          id
          name
          processedAt
          displayFulfillmentStatus
          lineItems(first: 25) {
            edges {
              node {
                id
                title
                sku
                quantity
                image { url }
              }
            }
          }
        }
      }
    }
  }
`;

interface RawOrders {
  orders: {
    edges: {
      node: {
        id: string;
        name: string;
        processedAt: string | null;
        displayFulfillmentStatus: string | null;
        lineItems: {
          edges: {
            node: {
              id: string;
              title: string;
              sku: string | null;
              quantity: number;
              image: { url: string } | null;
            };
          }[];
        };
      };
    }[];
  };
}

// Escape quotes/backslashes in the Shopify search string.
const esc = (v: string) => v.replace(/["\\]/g, "\\$&");

/**
 * Look up orders by a single identifier: an email (contains "@") or an order
 * number. Returns most-recent-first. The caller decides whether one or many.
 */
export async function lookupOrders(identifier: string): Promise<OrderSummary[]> {
  const id = identifier.trim();
  if (!id) return [];

  const q = id.includes("@")
    ? `email:${esc(id)}`
    : `name:${esc(id.replace(/^#/, ""))}`;

  const data = await shopifyGraphQL<RawOrders>(ORDERS_QUERY, { q });

  return data.orders.edges.map(({ node }) => ({
    id: node.id,
    name: node.name,
    processedAt: node.processedAt,
    fulfillmentStatus: node.displayFulfillmentStatus,
    customerFirstName: null,
    products: node.lineItems.edges.map(({ node: li }) => ({
      lineItemId: li.id,
      title: li.title,
      sku: li.sku ?? null,
      quantity: li.quantity,
      imageUrl: li.image?.url ?? null,
    })),
  }));
}
