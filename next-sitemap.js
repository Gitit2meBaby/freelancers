// next-sitemap.config.js
/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || "https://freelancers.com.au",
  generateRobotsTxt: true,
  generateIndexSitemap: false, // Set to true if you have >50k URLs
  exclude: [
    "/api/*",
    "/admin/*",
    "/debug/*",
    "/test/*",
    "/edit-profile",
    "/my-account/*",
    "/reset-password",
    "/forgot-password",
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/debug/",
          "/test/",
          "/edit-profile",
          "/my-account/",
          "/reset-password",
          "/forgot-password",
        ],
      },
    ],
  },
  // Transform function to modify sitemap entries
  transform: async (config, path) => {
    // Customize priority and changefreq based on path
    let priority = 0.7;
    let changefreq = "weekly";

    if (path === "/") {
      priority = 1.0;
      changefreq = "daily";
    } else if (path === "/crew-directory" || path === "/screen-services") {
      priority = 0.9;
      changefreq = "daily";
    } else if (path.startsWith("/crew-directory/")) {
      priority = 0.8;
      changefreq = "weekly";
    } else if (path === "/contact-us" || path === "/about-us") {
      priority = 0.8;
      changefreq = "monthly";
    }

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
    };
  },
};
