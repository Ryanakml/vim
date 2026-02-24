/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  async rewrites() {
    const nodeProcess =
      /** @type {{ env?: Record<string, string | undefined> } | undefined} */ (
        globalThis["process"]
      );
    const landingProxyOrigin =
      nodeProcess?.env?.NEXT_PUBLIC_LANDING_PROXY_ORIGIN;

    if (!landingProxyOrigin) {
      return [];
    }

    return [
      {
        source: "/",
        destination: `${landingProxyOrigin}/`,
      },
    ];
  },
};

export default nextConfig;
