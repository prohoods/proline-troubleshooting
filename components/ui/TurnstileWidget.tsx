"use client";

import { useEffect, useRef } from "react";

/*
 * Cloudflare Turnstile.
 *
 * The widget must be rendered into the LIGHT DOM, not into the shadow root the
 * rest of this app lives in. Turnstile will happily create its hidden response
 * field inside a shadow root but never runs the challenge there — the tell is a
 * mounted widget with zero iframes — so no token is ever issued and every
 * submission is rejected server-side.
 *
 * So this component renders nothing itself: on mount it appends a container
 * next to the shadow host (in the page's own DOM) and renders Turnstile there.
 * `interaction-only` keeps it invisible unless Cloudflare actually needs to
 * challenge someone, in which case it appears just above the form.
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

/** The element in the page's own DOM that hosts our shadow root. */
function lightDomAnchor(from: HTMLElement): HTMLElement {
  const root = from.getRootNode();
  const host =
    root instanceof ShadowRoot ? (root.host as HTMLElement | null) : null;
  return host?.parentElement ?? document.body;
}

/** Whether a bot check is configured at all — the flow runs without one. */
export function turnstileEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
}

export function TurnstileWidget({
  onToken,
}: {
  onToken: (token: string | null) => void;
}) {
  const marker = useRef<HTMLSpanElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

  useEffect(() => {
    if (!siteKey || !marker.current) return;
    let widgetId: string | undefined;
    let cancelled = false;

    // Match the widget's own content column and centre it, so an interactive
    // challenge lands directly under the form rather than adrift at the edge of
    // the page where nobody looks for it.
    const container = document.createElement("div");
    container.setAttribute("data-proline-turnstile", "");
    Object.assign(container.style, {
      maxWidth: "768px",
      margin: "0 auto 24px",
      padding: "0 24px",
      display: "flex",
      justifyContent: "center",
    });
    lightDomAnchor(marker.current).appendChild(container);

    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        widgetId = window.turnstile.render(container, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          // A failed or expired challenge clears the token so a stale one is
          // never submitted.
          "error-callback": () => onToken(null),
          "expired-callback": () => onToken(null),
          appearance: "interaction-only",
          theme: "light",
        });
      })
      .catch(() => {
        // Script blocked (extension, network). The server decides what happens
        // with a missing token; no dead end is shown here.
        onToken(null);
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      container.remove();
    };
    // onToken is a setState wrapper from the parent; re-running would rebuild
    // the widget and throw away a good token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  // Only a positioning marker — the widget itself lives outside the shadow root.
  if (!siteKey) return null;
  return <span ref={marker} hidden />;
}
