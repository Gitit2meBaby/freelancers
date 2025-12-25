/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://www.officeexperts.com.au",
  generateRobotsTxt: true,
  changefreq: "weekly",
  priority: 0.7,
  exclude: ["/api/*"],
  generateIndexSitemap: false,
  trailingSlash: false,
};
