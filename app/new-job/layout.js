// app/new-job/layout.js
export const metadata = {
  title: "New Job - Freelancers Promotions",
  description:
    "Submit a new job to Freelancers Promotions. Provide job details, production information, and crew requirements for film, television, and commercial productions in Melbourne and Australia.",
  alternates: {
    canonical: "https://freelancers.com.au/new-job/",
  },
  openGraph: {
    locale: "en_US",
    type: "article",
    title: "New Job - Freelancers Promotions",
    description:
      "Submit a new job to Freelancers Promotions. Provide job details, production information, and crew requirements for film, television, and commercial productions in Melbourne and Australia.",
    url: "https://freelancers.com.au/new-job/",
    siteName: "Freelancers Promotions",
    modifiedTime: new Date().toISOString(),
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: false, // Typically you don't want job submission forms indexed
    follow: true,
  },
};

export default function NewJobLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://freelancers.com.au/new-job",
        url: "https://freelancers.com.au/new-job",
        name: "New Job - Freelancers Promotions",
        isPartOf: { "@id": "https://freelancers.com.au/#website" },
        datePublished: "2026-01-15T13:58:07+00:00",
        dateModified: "2026-01-15T05:01:03+00:00",
        breadcrumb: {
          "@id": "https://freelancers.com.au/new-job/#breadcrumb",
        },
        inLanguage: "en-AU",
        potentialAction: [
          {
            "@type": "ReadAction",
            target: ["https://freelancers.com.au/new-job"],
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://freelancers.com.au/new-job/#breadcrumb",
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
            name: "New Job",
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
