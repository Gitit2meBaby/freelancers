export const metadata = {
  title: "Screen Services | Freelancers Promotions",
  description:
    "Find expert freelancers offering screen services for film production, from scriptwriting to special effects with top-tier professionals.",
  keywords:
    "screen services, film production, freelancers, scriptwriting, special effects, production professionals",
  authors: [{ name: "Freelancers Promotions" }],
  creator: "Freelancers Promotions",
  publisher: "Freelancers Promotions",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://freelancers.com.au"),
  alternates: {
    canonical: "/screen-services",
  },
  openGraph: {
    title: "Screen Services | Freelancers Promotions",
    description:
      "Find expert freelancers offering screen services for film production, from scriptwriting to special effects with top-tier professionals.",
    url: "https://freelancers.com.au/screen-services",
    siteName: "Freelancers Promotions",
    locale: "en_AU",
    type: "article",
    publishedTime: "2023-08-27T07:57:21+00:00",
    modifiedTime: "2026-01-01T00:00:00+00:00",
    images: [
      {
        url: "/logo.png",
        width: 300,
        height: 66,
        alt: "Freelancers Promotions Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Screen Services | Freelancers Promotions",
    description:
      "Find expert freelancers offering screen services for film production, from scriptwriting to special effects with top-tier professionals.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function ScreenServicesLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://freelancers.com.au/screen-services",
        url: "https://freelancers.com.au/screen-services",
        name: "Screen Services | Freelancers Promotions",
        isPartOf: { "@id": "https://freelancers.com.au/#website" },
        datePublished: "2023-08-27T07:57:21+00:00",
        dateModified: "2026-01-01T00:00:00+00:00",
        description:
          "Find expert freelancers offering screen services for film production, from scriptwriting to special effects with top-tier professionals.",
        breadcrumb: {
          "@id": "https://freelancers.com.au/screen-services/#breadcrumb",
        },
        inLanguage: "en-AU",
        potentialAction: [
          {
            "@type": "ReadAction",
            target: ["https://freelancers.com.au/screen-services"],
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://freelancers.com.au/screen-services/#breadcrumb",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://freelancers.com.au",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Screen Services",
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://freelancers.com.au/#website",
        url: "https://freelancers.com.au",
        name: "Freelancers Promotions",
        description:
          "Melbourne's primary portal to employment on screen productions",
        publisher: { "@id": "https://freelancers.com.au/#organization" },
        potentialAction: [
          {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "https://freelancers.com.au/?s={search_term_string}",
            },
            "query-input": {
              "@type": "PropertyValueSpecification",
              valueRequired: true,
              valueName: "search_term_string",
            },
          },
        ],
        inLanguage: "en-AU",
      },
      {
        "@type": "Organization",
        "@id": "https://freelancers.com.au/#organization",
        name: "Freelancers Promotions",
        url: "https://freelancers.com.au",
        logo: {
          "@type": "ImageObject",
          inLanguage: "en-AU",
          "@id": "https://freelancers.com.au/#/schema/logo/image/",
          url: "https://freelancers.com.au/logo.png",
          contentUrl: "https://freelancers.com.au/logo.png",
          width: 300,
          height: 66,
          caption: "Freelancers Promotions",
        },
        image: { "@id": "https://freelancers.com.au/#/schema/logo/image/" },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
