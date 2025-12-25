// app/crew-directory/layout.js
export const metadata = {
  title: "Crew Directory - Freelancers Promotions",
  description:
    "Discover top-tier film crew freelancers across Australia with Freelancers Promotion. Connect with experienced professionals in cinematography, sound, editing, and more. Find the perfect fit for your film crew needs today!",
  alternates: {
    canonical: "https://freelancers.com.au/crew-directory",
  },
  openGraph: {
    locale: "en_US",
    type: "article",
    title: "Crew Directory - Freelancers Promotions",
    description:
      "Discover top-tier film crew freelancers across Australia with Freelancers Promotion. Connect with experienced professionals in cinematography, sound, editing, and more. Find the perfect fit for your film crew needs today!",
    url: "https://freelancers.com.au/crew-directory",
    siteName: "Freelancers Promotions",
    modifiedTime: "2026-01-01T00:00:00+00:00",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function CrewDirectoryLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://freelancers.com.au/crew-directory",
        url: "https://freelancers.com.au/crew-directory",
        name: "Crew Directory - Freelancers Promotions",
        isPartOf: { "@id": "https://freelancers.com.au/#website" },
        datePublished: "2026-01-01T00:00:00+00:00",
        dateModified: "2026-01-01T00:00:00+00:00",
        description:
          "Discover top-tier film crew freelancers across Australia with Freelancers Promotion. Connect with experienced professionals in cinematography, sound, editing, and more. Find the perfect fit for your film crew needs today!",
        breadcrumb: {
          "@id": "https://freelancers.com.au/crew-directory#breadcrumb",
        },
        inLanguage: "en-AU",
        potentialAction: [
          {
            "@type": "ReadAction",
            target: ["https://freelancers.com.au/crew-directory"],
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://freelancers.com.au/crew-directory#breadcrumb",
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
            name: "Crew Directory",
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
              urlTemplate: "https://freelancers.com.au?s={search_term_string}",
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
          "@id": "https://freelancers.com.au/#/schema/logo/image",
          url: "https://freelancers.com.au/logo.png",
          contentUrl: "https://freelancers.com.au/logo.png",
          width: 300,
          height: 66,
          caption: "Freelancers Promotions",
        },
        image: { "@id": "https://freelancers.com.au/#/schema/logo/image" },
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
