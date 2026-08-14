import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Troubleshooter } from "@/components/questionnaire/Troubleshooter";
import { categories } from "@/lib/flow";
// `?inline` hands us the compiled CSS as a string instead of injecting a
// <style> into the document head — we need it inside the shadow root.
import css from "./widget.css?inline";

/*
 * Storefront widget entry point.
 *
 * Shopify's App Proxy renders our response inside the live theme, between the
 * real header and footer. That means our markup shares a document with the
 * theme's CSS, and the Proline theme uses `hidden`, `block`, `flex`, and `grid`
 * as its own class names — all of which Tailwind also defines. So the whole
 * widget mounts into a shadow root: our styles can't escape and reformat the
 * storefront, and the theme's styles can't leak in and wreck the flow.
 *
 * No AppShell here — the theme supplies the page chrome.
 */
const MOUNT_ID = "proline-troubleshooter";

/*
 * Tailwind v4 compiles its utilities against internal --tw-* variables and
 * declares them with @property. @property registration is DOCUMENT-scoped — the
 * browser ignores those rules inside a shadow root — so every one of them was
 * unset here. `border-style: var(--tw-border-style)` resolved to nothing, which
 * meant NO border rendered anywhere in the widget at any width or colour, and
 * box-shadow utilities silently did nothing.
 *
 * Registering them against the document restores the initial values inside the
 * shadow tree, because registration is global. Doing the same thing in CSS
 * wouldn't work: a plain `*` rule outranks the layered utilities that set these
 * variables, so shadows would break instead.
 *
 * Only the variables @property gives an initial-value need this; the rest are
 * guaranteed-invalid by design and their var() fallbacks already cover it.
 */
const TW_PROPERTIES: Array<[name: string, syntax: string, initial: string]> = [
  ["--tw-border-style", "*", "solid"],
  ["--tw-space-y-reverse", "*", "0"],
  ["--tw-shadow", "*", "0 0 #0000"],
  ["--tw-shadow-alpha", "<percentage>", "100%"],
  ["--tw-inset-shadow", "*", "0 0 #0000"],
  ["--tw-inset-shadow-alpha", "<percentage>", "100%"],
  ["--tw-ring-shadow", "*", "0 0 #0000"],
  ["--tw-inset-ring-shadow", "*", "0 0 #0000"],
  ["--tw-ring-offset-shadow", "*", "0 0 #0000"],
  ["--tw-ring-offset-width", "<length>", "0px"],
  ["--tw-ring-offset-color", "*", "#fff"],
  ["--tw-drop-shadow-alpha", "<percentage>", "100%"],
];

function registerTailwindProperties() {
  if (typeof CSS === "undefined" || !CSS.registerProperty) return;
  for (const [name, syntax, initialValue] of TW_PROPERTIES) {
    try {
      CSS.registerProperty({
        name,
        syntax,
        inherits: false,
        initialValue,
      });
    } catch {
      // Already registered (re-mount, or another Tailwind v4 bundle on the
      // page) — the existing registration is equivalent.
    }
  }
}

function mount() {
  const host = document.getElementById(MOUNT_ID);
  if (!host || host.shadowRoot) return; // missing, or already mounted

  registerTailwindProperties();

  // Options come off the mount element, so they're editable from the Shopify
  // theme editor's Custom Liquid block without a redeploy:
  //
  //   data-skip-welcome="true"   — the page supplies its own intro and <h1>
  //   data-category="range_hood" — open on the first real question
  //
  // Defaults reproduce the standalone behaviour (welcome → picker → questions).
  const skipWelcome = host.dataset.skipWelcome === "true";
  const categoryId = host.dataset.category?.trim();
  const initialCategory = categoryId
    ? (categories.find((c) => c.id === categoryId && c.available) ?? null)
    : null;

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = css;
  shadow.appendChild(style);

  const root = document.createElement("div");
  shadow.appendChild(root);

  createRoot(root).render(
    <StrictMode>
      <Troubleshooter
        mode="customer"
        skipWelcome={skipWelcome}
        initialCategory={initialCategory}
      />
    </StrictMode>,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}
