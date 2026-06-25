// Pure types shared by the Shopify lookup (server) and the UI (client).
// No runtime code here, so it's safe to import from client components.

export interface OrderProduct {
  lineItemId: string;
  title: string;
  sku: string | null;
  quantity: number;
  imageUrl: string | null;
}

export interface OrderSummary {
  id: string;
  name: string; // e.g. "#1001"
  processedAt: string | null;
  fulfillmentStatus: string | null;
  email: string | null;
  customerName: string | null;
  products: OrderProduct[];
}

/** The order + the specific product the user selected at the lookup step. */
export interface SelectedOrder {
  orderId: string;
  orderName: string;
  processedAt: string | null;
  fulfillmentStatus: string | null;
  email: string | null;
  customerName: string | null;
  product: OrderProduct;
}
