/** @type {import('next').NextConfig} */
const nextConfig = {
  // Playwright's Chromium binary must not be bundled/traced into the
  // serverless output — this app needs a regular long-running Node server.
  serverExternalPackages: ["playwright"],
};

export default nextConfig;
