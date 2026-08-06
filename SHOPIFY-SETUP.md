# Embedding the troubleshooting guide in the Proline storefront

Goal: customers reach the guide at

```
https://prolinerangehoods.com/tools/troubleshoot
```

on the Proline domain, with no iframe and no visible hand-off to another site.

## How it works (the short version)

Shopify does not host application code. Every Shopify app — Klaviyo, Redo, all
of them — runs on its own servers and is granted a *badge* by Shopify that lets
it act on a store. One of the things that badge unlocks is an **App Proxy**: a
pass-through window where a URL on the store's domain quietly serves content
fetched from the app's server.

So the dining room is Shopify and the kitchen stays on Vercel:

```
customer → prolinerangehoods.com/tools/troubleshoot   (Shopify)
              └── forwards, signed → <app origin>/customer   (Vercel)
```

The page HTML travels through that window. Static assets and API calls do
**not** — they go straight to the app's own origin. Two documented App Proxy
limitations make routing them through the proxy a bad idea:

1. `POST multipart/form-data` through the proxy is unreliable, and the support
   form uploads up to 8 photos.
2. The proxy's request timeout is undocumented, and a customer's case
   submission runs an AI pre-diagnosis that can take ~25s.

That split is what `NEXT_PUBLIC_APP_ORIGIN` (assets + API base) and
`STOREFRONT_ORIGINS` (CORS allow-list) configure.

---

## What Jett needs to do in Shopify

You need a **Partner-dashboard app**. A store-admin "custom app" (Settings →
Apps → Develop apps — where the existing `shpat_` order-lookup token came from)
**cannot** configure an app proxy. This is a second, separate app; it does not
replace or disturb the existing token.

### 1. Create the app

1. Go to <https://partners.shopify.com> and sign in (create a free Partner
   account if you don't have one — it's free and unrelated to store billing).
2. **Apps → Create app → Create app manually**.
3. Name it something recognizable, e.g. `Proline Troubleshooting`.
4. Open the app → **Configuration**, and note the **Client secret**. That is
   `SHOPIFY_APP_PROXY_SECRET`.

### 2. Configure the app proxy

Still under **Configuration**, find **App proxy**:

| Field | Value |
| --- | --- |
| Subpath prefix | `tools` |
| Subpath | `troubleshoot` |
| Proxy URL | `https://<your-app-origin>/customer` |

`<your-app-origin>` is the app's Vercel URL (or a custom domain pointed at it).

Shopify allows only four subpath prefixes — `a`, `apps`, `community`, `tools` —
and one proxy route per app. Paths *below* the route forward automatically.

### 3. Install it on the store

From the app's page: **Test your app** / **Select store** → choose the Proline
store → install. Nothing is billed; the app has no admin UI.

### 4. Set the Vercel environment variables

In Vercel → the project → **Settings → Environment Variables** (Production):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_ORIGIN` | the app's own absolute origin, e.g. `https://proline-troubleshooting.vercel.app` |
| `STOREFRONT_ORIGINS` | `https://prolinerangehoods.com,https://www.prolinerangehoods.com` |
| `SHOPIFY_APP_PROXY_SECRET` | the Client secret from step 1 |

**Redeploy after setting them.** `NEXT_PUBLIC_APP_ORIGIN` is baked in at build
time (it drives `assetPrefix`), so a change only takes effect on a fresh build.

### 5. Verify

Visit `https://prolinerangehoods.com/tools/troubleshoot`. You should see the
guide, styled, on the Proline domain. Then walk one flow end to end and confirm
a Stopgap case is created with photos attached.

---

## Behaviour of the security gate

`lib/shopify/appProxy.ts` verifies Shopify's HMAC signature on the query string
(drop `signature`, render remaining params as `key=value` with multi-values
comma-joined, sort, concatenate with no separator, HMAC-SHA256 with the client
secret, hex, constant-time compare).

| Request | With secret set | Without secret set |
| --- | --- | --- |
| Valid signature (real Shopify traffic) | served | served |
| Forged / tampered signature | **404** | served |
| No signature at all (direct Vercel URL) | served | served |

Unsigned requests deliberately still work so the Vercel URL remains usable for
internal QA and for sharing a preview. If you later want the customer flow to be
reachable *only* through the storefront, change `proxyRequestAllowed` in
`lib/shopify/appProxy.ts` to require a signature whenever the secret is set.

---

## Open items before a public launch

- **Ranges flow does not exist yet.** Link the guide from hood product pages
  only until it does.
- **Bot protection.** Every customer submission costs money (the Stopgap call
  plus the AI call). There is a per-instance rate limit, but a real bot check
  (Cloudflare Turnstile is free) is worth adding before the link goes on
  high-traffic pages.
- **Privacy note.** Completed runs store names, emails, and photos. Worth a
  one-line disclosure and a retention decision.
- **Analytics.** Add the GA4 tag to the customer flow so deflection rate
  (fixed vs. filed a case) shows up alongside the rest of the store's data.
