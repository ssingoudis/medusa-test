/**
 * The brands of the demo. Each brand is one sales channel with its own
 * publishable API key, i.e. one storefront on its own domain.
 *
 * These are placeholder names. Rename them here before seeding a fresh
 * database; `slug` is used for file names, SKUs and compose service names.
 */
export type Brand = {
  slug: string
  name: string
  description: string
}

export const BRANDS: Brand[] = [
  {
    slug: "albrecht",
    name: "Albrecht & Söhne",
    description: "Klassische Herrenanzüge im Premiumsegment.",
  },
  {
    slug: "nordkant",
    name: "Nordkant",
    description: "Moderne Slim-Fit-Anzüge für Stadt und Büro.",
  },
  {
    slug: "festwerk",
    name: "Festwerk",
    description: "Hochzeitsanzüge, Smokings und Abendmode.",
  },
  {
    slug: "kontor9",
    name: "Kontor 9",
    description: "Business-Anzüge zum Einstiegspreis.",
  },
]

/** Title of the publishable API key that belongs to a brand's storefront. */
export const storefrontKeyTitle = (brand: Brand) => `Storefront ${brand.name}`
