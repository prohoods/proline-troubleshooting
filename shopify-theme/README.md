# Shopify theme files

These are **not** part of the Next.js app — they're copies of files that live in
the Proline Shopify theme, kept here so the widget's contract and its host stay
in sync. Editing them here changes nothing; they have to be pasted into the
theme.

| File | Goes in the theme at |
| --- | --- |
| `sections/proline-troubleshooter.liquid` | `sections/proline-troubleshooter.liquid` |
| `templates/page.troubleshooting.json` | `templates/page.troubleshooting.json` |

## What they do

`proline-troubleshooter.liquid` mounts the widget bundle
(`/widget/troubleshooter.js`) and exposes its options as theme-editor settings.
`page.troubleshooting.json` is a page template that includes that section, so a
page assigned this template can have headings, FAQ, and any other sections added
around the guide from the theme editor.

## Two things that will bite whoever edits this next

**The inline `!important` styles on the mount div are load-bearing.** This theme
has a rule matching a bare `<div>` in the content area that sets
`display: none`, which collapses the widget to 0×0 while its contents render
perfectly. Removing those styles makes the guide silently vanish.

**Leave "Skip the welcome screen" on** whenever the page supplies its own `<h1>`.
The widget's welcome screen emits an `<h1>` of its own, so turning this off on an
SEO page produces two.

## Changing the app origin

`app_origin` is assigned at the top of the section. If the app ever moves off
`proline-troubleshooting.vercel.app`, update it there and in the Shopify app's
App Proxy URL (Dev Dashboard → Versions → Create version → App proxy).
