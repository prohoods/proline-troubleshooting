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
      /** Re-runs the challenge and issues a new pass through `callback`. */
      reset: (id?: string) => void;
    };
  }
}

/**
 * How long to wait for a pass before treating the check as broken. Generous:
 * a real challenge resolves in a second or two, and a slow connection should
 * not be mistaken for a failure.
 */
const UNAVAILABLE_AFTER_MS = 15_000;

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
  resetSignal = 0,
  onUnavailable,
}: {
  onToken: (token: string | null) => void;
  /**
   * Bump to throw away the current pass and get a new one.
   *
   * A pass is single-use, and the server rejecting one it has already seen
   * looks identical here to a pass that still works — Cloudflare only tells
   * the widget about expiry, not about use. Without this, a rejected send
   * leaves a dead pass in hand and every retry fails the same way, which is
   * the "please reload the page" dead end customers were hitting.
   */
  resetSignal?: number;
  /**
   * Called when the challenge hasn't produced a pass in a reasonable time.
   *
   * Cloudflare's challenge silently never completes for some people — Safari
   * with cross-site tracking prevention is the case we've seen — and the send
   * button then waits for something that is never coming. An eternal
   * "Checking…" is the worst possible outcome: the customer has answered every
   * question and has no idea why they can't send it.
   */
  onUnavailable?: () => void;
}) {
  const marker = useRef<HTMLSpanElement>(null);
  const refreshRef = useRef<() => void>(() => {});
  const onUnavailableRef = useRef(onUnavailable);
  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  }, [onUnavailable]);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

  useEffect(() => {
    if (!siteKey || !marker.current) return;
    let widgetId: string | undefined;
    let cancelled = false;

    const refresh = () => {
      if (cancelled || widgetId === undefined || !window.turnstile) return;
      try {
        window.turnstile.reset(widgetId);
      } catch {
        // Nothing useful to do — the send button stays disabled and the
        // customer can reload, which is what the copy already tells them.
      }
    };

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
          // Cloudflare's passes last five minutes and are single-use. Clearing
          // the token isn't enough on its own: the customer is then held on
          // "Checking…" forever with nothing left to wait for. Ask for a fresh
          // one immediately — the challenge is invisible unless it needs a
          // click, so this costs them nothing.
          "error-callback": () => {
            onToken(null);
            refresh();
          },
          "expired-callback": () => {
            onToken(null);
            refresh();
          },
          appearance: "interaction-only",
          theme: "light",
        });
      })
      .catch(() => {
        // Script blocked by an extension, a content blocker, or the network.
        // No amount of waiting fixes this one, so say so immediately.
        onToken(null);
        onUnavailableRef.current?.();
      });

    refreshRef.current = refresh;

    // Nothing after this point can rescue a challenge that never ran, so give
    // up and tell the parent rather than leaving the customer waiting.
    const giveUp = setTimeout(() => {
      if (!cancelled) onUnavailableRef.current?.();
    }, UNAVAILABLE_AFTER_MS);

    return () => {
      clearTimeout(giveUp);
      cancelled = true;
      refreshRef.current = () => {};
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      container.remove();
    };
    // onToken is a setState wrapper from the parent; re-running would rebuild
    // the widget and throw away a good token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  // Skips the first render: the freshly-rendered widget already has a pass.
  const firstSignal = useRef(resetSignal);
  useEffect(() => {
    if (resetSignal === firstSignal.current) return;
    refreshRef.current();
  }, [resetSignal]);

  // Only a positioning marker — the widget itself lives outside the shadow root.
  if (!siteKey) return null;
  return <span ref={marker} hidden />;
}
