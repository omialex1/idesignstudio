import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Headers sent with every page. No strict script policy (CSP) on purpose: it
// could break the site, and these already close the common gaps.
const securityHeaders = [
  // the site cannot be shown inside another site's frame (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value:
      "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
  // browsers must not guess file types
  { key: "X-Content-Type-Options", value: "nosniff" },
  // other sites only learn the origin, never the full address
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // features the shop never uses stay off
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // https only for a year (subdomains such as webmail are not included)
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
