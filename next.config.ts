import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit ships its standard-font .afm files and must be required at runtime
  // (not bundled) so those assets resolve in the serverless function.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
