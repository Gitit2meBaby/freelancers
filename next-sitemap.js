/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: process.env.SITE_URL || "https://www.freelancers.com.au",
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  exclude: [
    "/admin/*",
    "/api/*",
    "/member-login",
    "/edit-profile",
    "/my-account/*",
    "/forgot-password",
    "/reset-password",
    "/new-job",
    "/privacy-policy",
    "/_not-found",
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/member-login",
          "/edit-profile",
          "/my-account/",
          "/forgot-password",
          "/reset-password",
          "/new-job",
          "/privacy-policy",
        ],
      },
    ],
  },
  // Sitemap priorities
  transform: async (config, path) => {
    // Default priority
    let priority = 0.7;
    let changefreq = "weekly";

    // Home page - highest priority
    if (path === "/") {
      priority = 1.0;
      changefreq = "daily";
    }
    // Main public pages - high priority
    else if (
      [
        "/crew-directory",
        "/screen-services",
        "/about-us",
        "/contact-us",
        "/booking-guidelines",
      ].includes(path)
    ) {
      priority = 0.9;
      changefreq = "daily";
    }
    // Department pages - medium-high priority
    else if (path.match(/^\/crew-directory\/[^/]+$/)) {
      priority = 0.8;
      changefreq = "daily";
    }
    // Skill pages - medium priority
    else if (path.match(/^\/crew-directory\/[^/]+\/[^/]+$/)) {
      priority = 0.7;
      changefreq = "weekly";
    }
    // Service category pages
    else if (path.match(/^\/screen-services\/[^/]+$/)) {
      priority = 0.8;
      changefreq = "weekly";
    }
    // Other pages
    else {
      priority = 0.5;
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
