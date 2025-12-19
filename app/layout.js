import localFont from "next/font/local";
import { Roboto } from "next/font/google";
import "./globals.css";

// Load Clash Grotesk locally
const clashGrotesk = localFont({
  src: [
    {
      path: "./fonts/clash-grotesk/ClashGrotesk-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/clash-grotesk/ClashGrotesk-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/clash-grotesk/ClashGrotesk-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-primary",
  display: "swap",
});

// Load Roboto from Google
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-secondary",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://freelancers.com.au"),
  title: {
    default:
      "Expert Freelance Crew & Screen Production Services - Freelancers Promotions",
    template: "%s | Freelancers Promotions",
  },
  description:
    "Discover top-tier freelance crew and screen production services, offering exceptional expertise and creativity to bring your vision to life",
  keywords: ["freelance production services"],
  authors: [{ name: "Freelancers Promotions" }],
  creator: "Freelancers Promotions",
  publisher: "Freelancers Promotions",
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://freelancers.com.au/",
    title:
      "Expert Freelance Crew & Screen Production Services - Freelancers Promotions",
    description:
      "Discover top-tier freelance crew and screen production services, offering exceptional expertise and creativity to bring your vision to life",
    siteName: "Freelancers Promotions",
    images: [
      {
        url: "/logo.png",
        width: 300,
        height: 66,
        alt: "Freelancers Promotions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Expert Freelance Crew & Screen Production Services - Freelancers Promotions",
    description:
      "Discover top-tier freelance crew and screen production services, offering exceptional expertise and creativity to bring your vision to life",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "https://freelancers.com.au/",
  },
  verification: {
    // Add your verification codes when you have them
    // google: 'your-google-verification-code',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://freelancers.com.au/#website",
                  url: "https://freelancers.com.au/",
                  name: "Freelancers Promotions",
                  description:
                    "Melbourne's primary portal to employment on screen productions",
                  publisher: {
                    "@id": "https://freelancers.com.au/#organization",
                  },
                  potentialAction: [
                    {
                      "@type": "SearchAction",
                      target: {
                        "@type": "EntryPoint",
                        urlTemplate:
                          "https://freelancers.com.au/search?q={search_term_string}",
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
                  url: "https://freelancers.com.au/",
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
            }),
          }}
        />
      </head>
      <body className={`${clashGrotesk.variable} ${roboto.variable}`}>
        {children}
        {/* Google Tag Manager */}
        <Script
          id="google-gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag("set","linker",{"domains":["freelancers.com.au"]});
              gtag("js", new Date());
              gtag("set", "developer_id.dZTNiMT", true);
              gtag("config", "GT-P3J394W5");
            `,
          }}
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=GT-P3J394W5"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
