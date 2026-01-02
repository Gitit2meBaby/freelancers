/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fpsblobstorage.blob.core.windows.net",
        port: "",
        pathname: "/fpsblob/**",
      },
    ],
  },
};

export default nextConfig;
