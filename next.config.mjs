// unoptimized: true has been removed.
// It was added as an emergency fix during the April 2026 CPU outage to bypass
// the image optimiser. The root cause was the proxy route buffering image bytes
// through Node — that has been resolved in blobProxy.js and route.js.
// remotePatterns already covers both blob storage hostnames, so optimisation
// works correctly for all remote images.

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fpsblobstorage.blob.core.windows.net",
        port: "",
        pathname: "/fpsblob/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
