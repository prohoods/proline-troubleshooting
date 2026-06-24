"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type {
  OrderProduct,
  OrderSummary,
  SelectedOrder,
} from "@/lib/shopify/types";

type ErrKind =
  | "none_found"
  | "not_configured"
  | "rate_limited"
  | "upstream"
  | "input"
  | "generic";

const ERR_MSG: Record<ErrKind, string> = {
  none_found:
    "We couldn't find an order for that. Double-check your order number, or the email you used at checkout.",
  not_configured:
    "Order lookup isn't available right now. Please contact Proline support.",
  rate_limited: "Too many attempts — please wait a minute and try again.",
  upstream:
    "We're having trouble reaching our system. Please try again, or contact Proline support.",
  input: "Enter your order number or email to continue.",
  generic: "Something went wrong. Please try again.",
};

function mapError(status: number, code?: string): ErrKind {
  if (status === 429) return "rate_limited";
  if (status === 503 || code === "not_configured") return "not_configured";
  if (status === 400) return "input";
  if (status === 502 || code === "upstream") return "upstream";
  return "generic";
}

function formatStatus(s: string): string {
  return s
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function ShopifyLookup({
  placeholder,
  selected,
  onSelect,
  manual,
  onSetManual,
}: {
  placeholder?: string;
  selected: SelectedOrder | null;
  onSelect: (sel: SelectedOrder | null) => void;
  manual: boolean;
  onSetManual: (on: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState<ErrKind | null>(null);

  const search = async () => {
    const id = query.trim();
    if (!id) {
      setError("input");
      return;
    }
    setLoading(true);
    setError(null);
    setOrders(null);
    onSelect(null); // clear any prior selection when re-searching
    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: id }),
      });
      const json = (await res.json().catch(() => ({ ok: false }))) as {
        ok?: boolean;
        error?: string;
        orders?: OrderSummary[];
      };
      if (!res.ok || !json.ok) {
        setError(mapError(res.status, json.error));
        return;
      }
      const found = json.orders ?? [];
      setOrders(found);
      if (found.length === 0) setError("none_found");
    } catch {
      setError("upstream");
    } finally {
      setLoading(false);
    }
  };

  const pick = (order: OrderSummary, product: OrderProduct) =>
    onSelect({
      orderId: order.id,
      orderName: order.name,
      processedAt: order.processedAt,
      fulfillmentStatus: order.fulfillmentStatus,
      product,
    });

  const isPicked = (order: OrderSummary, p: OrderProduct) =>
    selected?.orderId === order.id &&
    selected?.product.lineItemId === p.lineItemId;

  if (manual) {
    return (
      <div className="rounded-2xl border border-line bg-mist/60 p-5">
        <p className="text-sm text-ink">
          No problem — we&apos;ll ask you a couple of quick questions about your
          hood instead.
        </p>
        <button
          type="button"
          onClick={() => onSetManual(false)}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky hover:text-sky-dark"
        >
          <Icon name="arrowLeft" className="h-4 w-4" /> Search for my order
          instead
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={query}
          aria-label="Order number or email"
          placeholder={placeholder}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-ink placeholder:text-muted/70 focus:border-sky"
        />
        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="shrink-0 rounded-full bg-sky px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-dark disabled:opacity-40"
        >
          {loading ? "Searching…" : "Find my order"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-muted">{ERR_MSG[error]}</p>}

      {orders && orders.length > 0 && (
        <div className="mt-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Select the product you need help with
          </p>
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-line bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-bold text-ink">{order.name}</span>
                {order.processedAt && (
                  <span className="text-muted">
                    {new Date(order.processedAt).toLocaleDateString()}
                  </span>
                )}
                {order.fulfillmentStatus && (
                  <span className="rounded-full bg-mist px-2 py-0.5 text-xs text-muted">
                    {formatStatus(order.fulfillmentStatus)}
                  </span>
                )}
                {order.customerFirstName && (
                  <span className="text-muted">· {order.customerFirstName}</span>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {order.products.map((p) => {
                  const picked = isPicked(order, p);
                  return (
                    <button
                      key={p.lineItemId}
                      type="button"
                      onClick={() => pick(order, p)}
                      aria-pressed={picked}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                        picked
                          ? "border-sky bg-sky-soft"
                          : "border-line bg-white hover:border-sky/50"
                      }`}
                    >
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-mist">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Icon name="hood" className="h-6 w-6 text-muted" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">
                          {p.title}
                        </span>
                        <span className="block text-xs text-muted">
                          {p.sku ? `SKU ${p.sku}` : "No SKU"} · Qty {p.quantity}
                        </span>
                      </span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          picked
                            ? "border-sky bg-sky text-white"
                            : "border-line text-transparent"
                        }`}
                      >
                        <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => onSetManual(true)}
        className="mt-5 block text-left text-sm font-medium text-sky hover:text-sky-dark"
      >
        Not sure? Enter info here →
      </button>
    </div>
  );
}
