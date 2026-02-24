/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  async rewrites() {
    const nodeProcess =
      /** @type {{ env?: Record<string, string | undefined> } | undefined} */ (
        globalThis["process"]
      );
    const landingProxyOrigin =
      nodeProcess?.env?.NEXT_PUBLIC_LANDING_PROXY_ORIGIN ||
      "https://chattiphy-landing-page.vercel.app";

    const normalizedLandingProxyOrigin = landingProxyOrigin.replace(/\/$/, "");

    return {
      beforeFiles: [
        {
          source: "/",
          destination: `${normalizedLandingProxyOrigin}/`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
