import type { Metadata } from "next";
import { Fraunces, Mulish, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const splineMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  // Absolute base for social-share image URLs (opengraph-image / twitter-image).
  // Without this, link previews would point at localhost/the Vercel preview URL
  // instead of the live domain.
  metadataBase: new URL("https://www.marginaliaart.com"),
  title: {
    default: "marginalia",
    template: "%s · marginalia",
  },
  description:
    "A community-driven, spoiler-safe reading companion. Discover art and discussion around the books you love — championing independent artists and authors — revealed only as far as you've read.",
  keywords: [
    "book art",
    "spoiler-safe",
    "indie authors",
    "independent artists",
    "reading community",
    "chapter by chapter",
    "book illustrations",
    "book discussions",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "marginalia",
    url: "https://www.marginaliaart.com",
    title: "marginalia — a community home for book art, without spoilers",
    description:
      "Discover art and discussion around the books you love — championing independent artists and authors — revealed only as far as you've read.",
  },
  twitter: {
    card: "summary_large_image",
    title: "marginalia — a community home for book art, without spoilers",
    description:
      "Discover art and discussion around the books you love — revealed only as far as you've read.",
  },
};

// Site-wide structured data: identifies the site and brand to search engines
// and AI answer-engines so they can attribute and surface it correctly.
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://www.marginaliaart.com/#website",
      url: "https://www.marginaliaart.com",
      name: "marginalia",
      description:
        "A community-driven, spoiler-safe reading companion for the art and discussion around the books you love.",
    },
    {
      "@type": "Organization",
      "@id": "https://www.marginaliaart.com/#org",
      name: "marginalia",
      url: "https://www.marginaliaart.com",
      logo: "https://www.marginaliaart.com/opengraph-image.png",
      email: "peterfazon@gmail.com",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${mulish.variable} ${splineMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
