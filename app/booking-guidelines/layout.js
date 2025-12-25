export const metadata = {
  title: "Booking Guidelines - Freelancers Promotions",
  description:
    "This guide has been produced to provide a reference of best practice processes for the engagement of crew in Victoria. We trust all production companies understand our booking guidelines.",

  // Canonical URL
  alternates: {
    canonical: "https://freelancers.com.au/booking-guidelines/",
  },

  // Open Graph metadata
  openGraph: {
    type: "article",
    locale: "en_US",
    url: "https://freelancers.com.au/booking-guidelines/",
    siteName: "Freelancers Promotions",
    title: "Booking Guidelines - Freelancers Promotions",
    description:
      "This guide has been produced to provide a reference of best practice processes for the engagement of crew in Victoria. We trust all production companies understand our booking guidelines.",
    modifiedTime: "2026-01-01T05:00:04+00:00",
  },

  // Twitter Card metadata
  twitter: {
    card: "summary_large_image",
  },
};

// JSON-LD structured data
export function generateJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://freelancers.com.au/booking-guidelines",
        url: "https://freelancers.com.au/booking-guidelines",
        name: "Booking Guidelines - Freelancers Promotions",
        isPartOf: { "@id": "https://freelancers.com.au/#website" },
        datePublished: "2026-01-01T12:23:31+00:00",
        dateModified: "2026-01-01T05:00:04+00:00",
        breadcrumb: {
          "@id": "https://freelancers.com.au/booking-guidelines/#breadcrumb",
        },
        inLanguage: "en-AU",
        potentialAction: [
          {
            "@type": "ReadAction",
            target: ["https://freelancers.com.au/booking-guidelines"],
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://freelancers.com.au/booking-guidelines/#breadcrumb",
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
            name: "Booking Guidelines",
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://freelancers.com.au/#website",
        url: "https://freelancers.com.au",
        name: "Freelancers Promotions",
        description: "",
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
}

export default function BookingGuidelinesLayout({ children }) {
  const jsonLd = generateJsonLd();

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
