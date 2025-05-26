import { Metadata } from "next"

export const siteConfig = {
  name: "REV",
  description: "Application complète de gestion d'activité freelance - Clients, Projets, Factures, Paiements",
  url: "https://rev-app.com",
  ogImage: "https://rev-app.com/og.jpg",
  links: {
    twitter: "https://twitter.com/rev_app",
    github: "https://github.com/rev-app/rev",
  },
}

export function constructMetadata({
  title = siteConfig.name,
  description = siteConfig.description,
  image = siteConfig.ogImage,
  ...props
}: {
  title?: string
  description?: string
  image?: string
} & Metadata): Metadata {
  return {
    title,
    description,
    keywords: [
      "freelance",
      "gestion",
      "facturation",
      "clients",
      "projets",
      "paiements",
      "Wave CI",
      "Côte d'Ivoire",
    ],
    authors: [
      {
        name: "REV Team",
      },
    ],
    creator: "REV Team",
    openGraph: {
      type: "website",
      locale: "fr_FR",
      url: siteConfig.url,
      title,
      description,
      siteName: siteConfig.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: siteConfig.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      creator: "@rev_app",
    },
    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon-16x16.png",
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
    ...props,
  }
} 