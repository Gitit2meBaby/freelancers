// app/member-login/layout.js
export const metadata = {
  title: "Member Login - Freelancers Promotions",
  description: "Member Login",
  alternates: {
    canonical: "https://freelancers.com.au/member-login",
  },
  openGraph: {
    locale: "en_US",
    type: "article",
    title: "Member Login - Freelancers Promotions",
    description: "Member Login",
    url: "https://freelancers.com.au/member-login",
    siteName: "Freelancers Promotions",
    modifiedTime: "2026-01-01T08:02:15+00:00",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function MemberLoginLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://freelancers.com.au/member-login",
        url: "https://freelancers.com.au/member-login",
        name: "Member Login - Freelancers Promotions",
        isPartOf: { "@id": "https://freelancers.com.au/#website" },
        datePublished: "2026-01-01T02:21:52+00:00",
        dateModified: "2026-01-01T08:02:15+00:00",
        breadcrumb: {
          "@id": "https://freelancers.com.au/member-login#breadcrumb",
        },
        inLanguage: "en-AU",
        potentialAction: [
          {
            "@type": "ReadAction",
            target: ["https://freelancers.com.au/member-login"],
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://freelancers.com.au/member-login#breadcrumb",
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
            name: "Member Login",
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
