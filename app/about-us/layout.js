export const metadata = {
  title: "About Us - Freelancers Promotions",
  description:
    "Melbourne's primary portal to employment on screen productions, providing experienced film technicians to longform drama, television commercials and online content.",

  // Canonical URL
  alternates: {
    canonical: "https://freelancers.com.au/about-us",
  },

  // Open Graph metadata
  openGraph: {
    locale: "en_US",
    type: "article",
    title: "About Us - Freelancers Promotions",
    description:
      "Melbourne's primary portal to employment on screen productions, providing experienced film technicians to longform drama, television commercials and online content.",
    url: "https://freelancers.com.au/about-us",
    siteName: "Freelancers Promotions",
    images: [
      {
        url: "https://freelancers.com.au/public/about/desk.webp",
        width: 1280,
        height: 678,
        alt: "About Freelancers Promotions",
      },
    ],
    modifiedTime: "2026-01-01T09:10:03+00:00",
  },

  // Twitter Card metadata
  twitter: {
    card: "summary_large_image",
    title: "About Us - Freelancers Promotions",
    description:
      "Melbourne's primary portal to employment on screen productions, providing experienced film technicians to longform drama, television commercials and online content.",
  },
};

function generateStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://freelancers.com.au/about-us",
        url: "https://freelancers.com.au/about-us",
        name: "About Us - Freelancers Promotions",
        isPartOf: {
          "@id": "https://freelancers.com.au/#website",
        },
        datePublished: "2026-01-01T17:35:54+00:00",
        dateModified: "2026-01-01T09:10:03+00:00",
        description:
          "Melbourne's primary portal to employment on screen productions, providing experienced film technicians to longform drama, television commercials and online content.",
        breadcrumb: {
          "@id": "https://freelancers.com.au/about-us/#breadcrumb",
        },
        inLanguage: "en-AU",
        potentialAction: [
          {
            "@type": "ReadAction",
            target: ["https://freelancers.com.au/about-us"],
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://freelancers.com.au/about-us/#breadcrumb",
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
            name: "About Us",
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://freelancers.com.au/#website",
        url: "https://freelancers.com.au",
        name: "Freelancers Promotions",
        description: "",
        publisher: {
          "@id": "https://freelancers.com.au/#organization",
        },
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
        image: {
          "@id": "https://freelancers.com.au/#/schema/logo/image/",
        },
      },
    ],
  };
}

export default function AboutUsLayout({ children }) {
  const structuredData = generateStructuredData();

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      {/* Page Content */}
      {children}
    </>
  );
}
