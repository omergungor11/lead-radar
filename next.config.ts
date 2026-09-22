import type { NextConfig } from "next";

// Üst dizinlerdeki yabancı lockfile'lar (Work-Restored/../package-lock.json) Next'in
// workspace root tahminini bozuyor → kökü bu projeye sabitle.
const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
};

export default nextConfig;
