import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Troubleshooter } from "@/components/questionnaire/Troubleshooter";
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

function mount() {
  const host = document.getElementById(MOUNT_ID);
  if (!host || host.shadowRoot) return; // missing, or already mounted

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = css;
  shadow.appendChild(style);

  const root = document.createElement("div");
  shadow.appendChild(root);

  createRoot(root).render(
    <StrictMode>
      <Troubleshooter mode="customer" />
    </StrictMode>,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}
