// Vite's `?inline` suffix resolves a stylesheet to its compiled text rather
// than injecting it into the document. TypeScript needs to be told.
declare module "*.css?inline" {
  const css: string;
  export default css;
}
