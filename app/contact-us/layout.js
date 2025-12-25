// app/contact-us/layout.js
export const metadata = {
  title: "Contact Us - Freelancers Promotions",
  description:
    "Contact Freelancers Promotions - Address PO Box 5010, South Melbourne, Vic 3205 Email info@freelancers.com.au Phone +613 9682 2722 Send us a message",
  alternates: {
    canonical: "https://freelancers.com.au/contact-us/",
  },
  openGraph: {
    locale: "en_US",
    type: "article",
    title: "Contact Us - Freelancers Promotions",
    description:
      "Contact Freelancers Promotions - Address PO Box 5010, South Melbourne, Vic 3205 Email info@freelancers.com.au Phone +613 9682 2722 Send us a message",
    url: "https://freelancers.com.au/contact-us/",
    siteName: "Freelancers Promotions",
    modifiedTime: "2025-08-29T05:01:03+00:00",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function ContactUsLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://freelancers.com.au/contact-us",
        url: "https://freelancers.com.au/contact-us",
        name: "Contact Us - Freelancers Promotions",
        isPartOf: { "@id": "https://freelancers.com.au/#website" },
        datePublished: "2023-08-23T13:58:07+00:00",
        dateModified: "2025-08-29T05:01:03+00:00",
        breadcrumb: {
          "@id": "https://freelancers.com.au/contact-us/#breadcrumb",
        },
        inLanguage: "en-AU",
        potentialAction: [
          {
            "@type": "ReadAction",
            target: ["https://freelancers.com.au/contact-us"],
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://freelancers.com.au/contact-us/#breadcrumb",
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
            name: "Contact Us",
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
