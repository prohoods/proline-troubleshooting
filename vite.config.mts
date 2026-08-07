import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/*
 * Builds the storefront widget — a self-contained bundle Shopify's App Proxy
 * drops into the live theme. Separate from the Next build, which still serves
 * the agent console at / and the standalone customer flow at /customer.
 *
 * Output goes to public/widget/, so Next serves it as a static asset and the
 * liquid fragment can point at it on this app's origin.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Next owns public/ — Vite must not try to copy it into its own outDir,
  // which lives inside it.
  publicDir: false,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  define: {
    // The components read this to decide where API calls go. Vite doesn't
    // provide process.env, so it's substituted at build time.
    "process.env.NEXT_PUBLIC_APP_ORIGIN": JSON.stringify(
      process.env.NEXT_PUBLIC_APP_ORIGIN ?? "",
    ),
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "public/widget",
    emptyOutDir: true,
    // A single IIFE with the CSS inlined into it — one <script> tag in the
    // liquid fragment, no stylesheet request, no flash of unstyled content.
    lib: {
      entry: fileURLToPath(new URL("./widget/main.tsx", import.meta.url)),
      formats: ["iife"],
      name: "ProlineTroubleshooter",
      fileName: () => "troubleshooter.js",
    },
    cssCodeSplit: false,
    sourcemap: false,
  },
});
