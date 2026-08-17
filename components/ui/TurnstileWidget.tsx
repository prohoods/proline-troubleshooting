"use client";

import { useEffect, useRef } from "react";

/*
 * Cloudflare Turnstile, rendered explicitly into a container we own.
 *
 * Two things make this awkward here. The widget lives inside a shadow root, so
 * the usual auto-render (which scans the document for .cf-turnstile) never sees
 * it — hence explicit rendering against a ref. And the script is loaded once
 * into the document head rather than per-mount, because Turnstile registers a
 * single global.
 *
 * Renders nothing at all when no site key is configured, so the flow works
 * unchanged before the keys exist.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          appearance?: "always" | "execute" | "interaction-only";
        },
      ) => string | undefined;
      remove: (id: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_ID = "cf-turnstile-script";

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject();
    document.head.appendChild(s);
  });
}

export function TurnstileWidget({
  onToken,
}: {
  onToken: (token: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

  // StrictMode runs effects twice on mount, which rendered two widgets and
  // left a stray hidden response field behind. Harmless — the token comes from
  // the callback, not the field — but it doubles the challenge work and makes
  // the DOM confusing to debug.
  const rendered = useRef(false);

  useEffect(() => {
    if (!siteKey || !ref.current || rendered.current) return;
    rendered.current = true;
    let widgetId: string | undefined;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          // A failed or expired challenge clears the token, so the submit
          // button can't send a stale one.
          "error-callback": () => onToken(null),
          "expired-callback": () => onToken(null),
          appearance: "interaction-only",
          theme: "light",
        });
      })
      .catch(() => {
        // Script blocked (extension, network). The server decides what to do
        // with a missing token; the customer isn't shown a dead end here.
        onToken(null);
      });

    return () => {
      cancelled = true;
      rendered.current = false;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
    // onToken is a setState wrapper from the parent; re-running would re-render
    // the widget and invalidate a good token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={ref} className="mt-4" />;
}
