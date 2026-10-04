/**
 * Demo data only: sets up a multi-brand suit catalogue to show how several
 * shops are managed from one Medusa backend.
 *
 *   - one sales channel per brand (see src/lib/brands.ts)
 *   - one publishable API key per brand, scoped to that sales channel;
 *     each storefront uses its brand's key and only sees its own catalogue
 *   - 26 suits (German texts, EUR prices), two of them sold by two brands
 *   - every brand channel linked to the stock location so stock is available
 *   - the starter's clothing products moved to draft
 *
 *   pnpm exec medusa exec ./src/scripts/seed-brands.ts
 *
 * Safe to re-run: sales channels, keys and products are matched by name,
 * title and handle and only created when missing. Product photos are
 * hotlinked from Unsplash (free licence) and are placeholders until real
 * product photos exist.
 */
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createSalesChannelsWorkflow,
  linkProductsToSalesChannelWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { BRANDS, storefrontKeyTitle } from "../lib/brands"

const SIZE_OPTION = "Größe"
const SIZES = ["46", "48", "50", "52", "54", "56"]
const STOCK_PER_VARIANT = 25
const SKU_PREFIX = "ANZUG"

const CATEGORIES = {
  suits: "Anzüge",
  evening: "Smokings & Abendmode",
  separates: "Sakkos & Kombinationen",
} as const

const COLLECTIONS = {
  business: "Business",
  festive: "Hochzeit & Fest",
  casual: "Smart Casual",
} as const

/** Products created by the starter's initial seed; hidden for the suit demo. */
const STARTER_HANDLES = ["t-shirt", "sweatshirt", "sweatpants", "shorts"]

const image = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`

type Suit = {
  handle: string
  title: string
  subtitle: string
  description: string
  /** Brand slugs. More than one means the product is sold in several shops. */
  brands: string[]
  category: keyof typeof CATEGORIES
  collection: keyof typeof COLLECTIONS
  material: string
  price: number
  photo: string
}

const SUITS: Suit[] = [
  // ---- Albrecht & Söhne: classic, premium ----------------------------------
  {
    handle: "zweireiher-savile-hellgrau",
    title: "Zweireiher Savile Hellgrau",
    subtitle: "Nadelstreifen, Regular Fit",
    description:
      "Zweireihiger Anzug mit feinem Nadelstreifen und breitem Spitzrevers. Ein Statement für alle, die klassische Schneiderkunst schätzen.",
    brands: ["albrecht"],
    category: "suits",
    collection: "business",
    material: "100 % Schurwolle Super 110",
    price: 699,
    photo: "1480429370139-e0132c086e2a",
  },
  {
    handle: "anzug-hamburg-marineblau",
    title: "Anzug Hamburg Marineblau",
    subtitle: "Modern Fit, Schurwolle",
    description:
      "Der vielseitigste Anzug im Schrank. Marineblau wirkt seriös, ohne hart zu sein, und lässt sich mit braunen wie schwarzen Schuhen kombinieren.",
    brands: ["albrecht"],
    category: "suits",
    collection: "business",
    material: "100 % Schurwolle Super 100",
    price: 599,
    photo: "1617137984095-74e4e5e3613f",
  },
  {
    handle: "anzug-frankfurt-nachtblau",
    title: "Anzug Frankfurt Nachtblau",
    subtitle: "Regular Fit, knitterarm",
    description:
      "Für lange Tage zwischen Meeting und Geschäftsreise. Der Stoff sitzt auch nach Stunden im Auto oder Flugzeug noch sauber.",
    brands: ["albrecht"],
    category: "suits",
    collection: "business",
    material: "98 % Schurwolle, 2 % Elasthan",
    price: 579,
    photo: "1623880840102-7df0a9f3545b",
  },
  {
    handle: "dreiteiler-kensington-marine",
    title: "Dreiteiler Kensington Marine",
    subtitle: "Mit Weste, Regular Fit",
    description:
      "Sakko, Weste und Hose aus einem Stoff. Die Weste macht aus einem guten Anzug einen besonderen und lässt sich auch ohne Sakko tragen.",
    brands: ["albrecht"],
    category: "suits",
    collection: "business",
    material: "100 % Schurwolle Super 120",
    price: 749,
    photo: "1717730798531-6a62ed43b871",
  },
  {
    handle: "anzug-mayfair-anthrazit",
    title: "Anzug Mayfair Anthrazit",
    subtitle: "Regular Fit, Spitzrevers",
    description:
      "Anthrazit mit leichtem Glanz und markantem Spitzrevers. Formell genug für den Vorstand, elegant genug für den Abend.",
    brands: ["albrecht"],
    category: "suits",
    collection: "business",
    material: "90 % Schurwolle, 10 % Seide",
    price: 629,
    photo: "1598808503746-f34c53b9323e",
  },
  {
    handle: "anzug-windsor-fensterkaro",
    title: "Anzug Windsor Fensterkaro",
    subtitle: "Slim Fit, Graugrün",
    description:
      "Graugrüner Anzug mit hellem Fensterkaro. Ein Muster, das auffällt und dennoch zurückhaltend bleibt. Sehr schön mit Fliege oder Strickkrawatte.",
    brands: ["albrecht"],
    category: "suits",
    collection: "casual",
    material: "100 % Schurwolle",
    price: 649,
    photo: "1600091166971-7f9faad6c1e2",
  },
  {
    handle: "anzug-highland-tweed",
    title: "Anzug Highland Tweed",
    subtitle: "Regular Fit, Glencheck Grau",
    description:
      "Kräftiger Wollstoff mit Glencheck-Muster für Herbst und Winter. Robust, warm und mit jedem Tragen ein Stück schöner.",
    brands: ["albrecht"],
    category: "suits",
    collection: "casual",
    material: "100 % Schurwolle (Tweed)",
    price: 669,
    photo: "1548454782-15b189d129ab",
  },

  // ---- Nordkant: modern slim fit, mid price --------------------------------
  {
    handle: "anzug-milano-schwarz",
    title: "Anzug Milano Schwarz",
    subtitle: "Slim Fit, Stretch",
    description:
      "Der schwarze Klassiker in schmaler Passform. Zweiknopf-Sakko mit fallendem Revers, dazu eine schlank geschnittene Hose.",
    brands: ["nordkant"],
    category: "suits",
    collection: "business",
    material: "70 % Schurwolle, 27 % Polyester, 3 % Elasthan",
    price: 399,
    photo: "1618886614638-80e3c103d31a",
  },
  {
    handle: "anzug-riviera-royalblau",
    title: "Anzug Riviera Royalblau",
    subtitle: "Slim Fit, leichter Sommerstoff",
    description:
      "Kräftiges Royalblau in einem leichten, atmungsaktiven Stoff. Ideal für Sommerhochzeiten und Anlässe, bei denen Schwarz zu streng wäre.",
    brands: ["nordkant"],
    category: "suits",
    collection: "festive",
    material: "70 % Schurwolle, 30 % Leinen",
    price: 379,
    photo: "1617137968427-85924c800a22",
  },
  {
    handle: "anzug-kiel-tiefschwarz",
    title: "Anzug Kiel Tiefschwarz",
    subtitle: "Extra Slim Fit",
    description:
      "Ton in Ton getragen mit schwarzem Hemd wirkt dieser Anzug besonders modern. Sehr schmal geschnitten, mit hohem Stretchanteil für Bewegungsfreiheit.",
    brands: ["nordkant"],
    category: "suits",
    collection: "festive",
    material: "65 % Schurwolle, 30 % Polyester, 5 % Elasthan",
    price: 389,
    photo: "1617127365659-c47fa864d8bc",
  },
  {
    handle: "anzug-soho-kobaltblau",
    title: "Anzug Soho Kobaltblau",
    subtitle: "Slim Fit, ungefüttert",
    description:
      "Leuchtendes Kobaltblau, leicht und ungefüttert. Funktioniert mit Hemd und Krawatte genauso wie mit T-Shirt und Sneakern.",
    brands: ["nordkant"],
    category: "suits",
    collection: "casual",
    material: "60 % Baumwolle, 37 % Polyester, 3 % Elasthan",
    price: 359,
    photo: "1495603889488-42d1d66e5523",
  },
  {
    handle: "anzug-oxford-blau-kariert",
    title: "Anzug Oxford Blau kariert",
    subtitle: "Slim Fit, Glencheck",
    description:
      "Blauer Anzug mit dezentem Karomuster. Aus der Nähe lebendig, aus der Entfernung ruhig. Eine gute Wahl, wenn es der zweite oder dritte Anzug sein soll.",
    brands: ["nordkant"],
    category: "suits",
    collection: "casual",
    material: "96 % Schurwolle, 4 % Elasthan",
    price: 419,
    photo: "1593030103066-0093718efeb9",
  },
  {
    handle: "kombination-torino-grau",
    title: "Kombination Torino Grau",
    subtitle: "Sakko grau, Hose schwarz",
    description:
      "Graues Sakko mit schwarzer Hose als fertig abgestimmte Kombination. Etwas lockerer als ein durchgehender Anzug und trotzdem angezogen.",
    brands: ["nordkant"],
    category: "separates",
    collection: "casual",
    material: "80 % Schurwolle, 20 % Polyamid",
    price: 349,
    photo: "1622497170185-5d668f816a56",
  },

  // ---- Festwerk: weddings and evening wear ---------------------------------
  {
    handle: "smoking-wien-schwarz",
    title: "Smoking Wien Schwarz",
    subtitle: "Schalkragen mit Satinbesatz",
    description:
      "Smoking mit Schalkragen aus Satin für Bälle, Galas und die eigene Hochzeit. Wird mit Smokinghemd und Fliege getragen.",
    // Sold by two brands: one product, two shops.
    brands: ["festwerk", "albrecht"],
    category: "evening",
    collection: "festive",
    material: "100 % Schurwolle, Besatz aus Seidensatin",
    price: 699,
    photo: "1522968439036-e6338d0ed84f",
  },
  {
    handle: "hochzeitsanzug-toskana-graublau",
    title: "Hochzeitsanzug Toskana Graublau",
    subtitle: "Dreiteiler mit Weste",
    description:
      "Graublauer Dreiteiler für die Trauung im Freien. Die Farbe harmoniert mit fast jedem Blumenschmuck und wirkt auf Fotos besonders weich.",
    brands: ["festwerk"],
    category: "suits",
    collection: "festive",
    material: "80 % Schurwolle, 20 % Leinen",
    price: 649,
    photo: "1604531826248-f0eca8eeb896",
  },
  {
    handle: "hochzeitsanzug-provence-hellgrau",
    title: "Hochzeitsanzug Provence Hellgrau",
    subtitle: "Slim Fit, Sommerqualität",
    description:
      "Hellgrauer Anzug in leichter Sommerqualität. Gemacht für Gartenhochzeiten und Feiern unter freiem Himmel.",
    brands: ["festwerk"],
    category: "suits",
    collection: "festive",
    material: "55 % Leinen, 45 % Schurwolle",
    price: 549,
    photo: "1529635229076-82fefed713c4",
  },
  {
    handle: "hochzeitsanzug-verona-anthrazit",
    title: "Hochzeitsanzug Verona Anthrazit",
    subtitle: "Modern Fit",
    description:
      "Anthrazit ist die zeitlose Alternative zu Schwarz. Dieser Anzug begleitet durch die Trauung und danach durch jeden festlichen Anlass.",
    brands: ["festwerk"],
    category: "suits",
    collection: "festive",
    material: "100 % Schurwolle",
    price: 499,
    photo: "1526922782478-4946233fabf5",
  },
  {
    handle: "anzug-salzburg-dunkelgruen",
    title: "Anzug Salzburg Dunkelgrün",
    subtitle: "Slim Fit, mit Weste erhältlich",
    description:
      "Tiefes Dunkelgrün für alle, die zur Feier etwas Eigenes tragen möchten. Besonders stimmungsvoll bei Herbst- und Winterhochzeiten.",
    brands: ["festwerk"],
    category: "suits",
    collection: "festive",
    material: "100 % Schurwolle",
    price: 579,
    photo: "1606216769898-c88daccaa479",
  },
  {
    handle: "anzug-bordeaux-nachtschwarz",
    title: "Anzug Bordeaux Nachtschwarz",
    subtitle: "Modern Fit, feiner Glanz",
    description:
      "Schwarzer Festanzug mit feinem Glanz. Mit weinroter Krawatte ein klassischer Auftritt für Trauzeugen und Gäste.",
    brands: ["festwerk"],
    category: "suits",
    collection: "festive",
    material: "95 % Schurwolle, 5 % Seide",
    price: 529,
    photo: "1606216769783-a7dbe227a17f",
  },
  {
    handle: "dreiteiler-opera-schwarz",
    title: "Dreiteiler Opera Schwarz",
    subtitle: "Mit Weste, Spitzrevers",
    description:
      "Schwarzer Dreiteiler mit Spitzrevers und hochgeschlossener Weste. Der große Auftritt für Oper, Ball und Abendgesellschaft.",
    brands: ["festwerk"],
    category: "evening",
    collection: "festive",
    material: "100 % Schurwolle Super 110",
    price: 729,
    photo: "1745270029066-8c1dfb37c03c",
  },

  // ---- Kontor 9: entry-level business --------------------------------------
  {
    handle: "anzug-basic-schwarz",
    title: "Anzug Basic Schwarz",
    subtitle: "Regular Fit, pflegeleicht",
    description:
      "Der unkomplizierte schwarze Anzug für jeden Anlass. Pflegeleichter Stoff, der auch nach der Maschinenwäsche in Form bleibt.",
    // Sold by two brands: one product, two shops.
    brands: ["kontor9", "nordkant"],
    category: "suits",
    collection: "business",
    material: "65 % Polyester, 33 % Viskose, 2 % Elasthan",
    price: 229,
    photo: "1617113930975-f9c7243ae527",
  },
  {
    handle: "anzug-office-dunkelblau",
    title: "Anzug Office Dunkelblau",
    subtitle: "Regular Fit",
    description:
      "Dunkelblauer Büroanzug mit dezenter Struktur. Ein verlässlicher Begleiter für fünf Tage die Woche.",
    brands: ["kontor9"],
    category: "suits",
    collection: "business",
    material: "54 % Polyester, 44 % Schurwolle, 2 % Elasthan",
    price: 249,
    photo: "1585846416120-3a7354ed7d39",
  },
  {
    handle: "anzug-start-blau",
    title: "Anzug Start Blau",
    subtitle: "Slim Fit",
    description:
      "Der erste Anzug für Ausbildung, Studium und Berufseinstieg. Schmal geschnitten und in einem Blau, das zu allem passt.",
    brands: ["kontor9"],
    category: "suits",
    collection: "business",
    material: "72 % Polyester, 26 % Viskose, 2 % Elasthan",
    price: 219,
    photo: "1594938328870-9623159c8c99",
  },
  {
    handle: "anzug-pendler-anthrazit",
    title: "Anzug Pendler Anthrazit",
    subtitle: "Regular Fit, knitterarm",
    description:
      "Knitterarm, atmungsaktiv und waschbar. Entwickelt für alle, die morgens in der Bahn sitzen und abends noch ordentlich aussehen wollen.",
    brands: ["kontor9"],
    category: "suits",
    collection: "business",
    material: "60 % Polyester, 38 % Schurwolle, 2 % Elasthan",
    price: 239,
    photo: "1610652492500-ded49ceeb378",
  },
  {
    handle: "anzug-campus-schwarz",
    title: "Anzug Campus Schwarz",
    subtitle: "Slim Fit",
    description:
      "Schmaler schwarzer Anzug für Abschlussfeier, Bewerbungsgespräch und die erste Hochzeitseinladung.",
    brands: ["kontor9"],
    category: "suits",
    collection: "festive",
    material: "70 % Polyester, 28 % Viskose, 2 % Elasthan",
    price: 199,
    photo: "1543132220-4bf3de6e10ae",
  },
  {
    handle: "anzug-messe-marineblau",
    title: "Anzug Messe Marineblau",
    subtitle: "Modern Fit, Stretch",
    description:
      "Marineblauer Anzug mit hohem Tragekomfort für lange Tage am Stand oder beim Kunden. Dehnbar an Schultern und Bund.",
    brands: ["kontor9"],
    category: "suits",
    collection: "casual",
    material: "62 % Polyester, 34 % Viskose, 4 % Elasthan",
    price: 259,
    photo: "1603394151492-5e9b974b090b",
  },
]

export default async function seedBrands({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // ---- Prerequisites created by the initial data seed ----------------------

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "sales_channels.id"],
  })
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.currency_code"],
  })

  const shippingProfile = shippingProfiles[0]
  const stockLocation = stockLocations[0]

  if (!shippingProfile || !stockLocation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Shipping profile or stock location missing. Run the initial data seed first (medusa db:migrate)."
    )
  }

  const currencyCodes: string[] = (stores[0]?.supported_currencies ?? [])
    .map((currency) => currency?.currency_code)
    .filter((code): code is string => Boolean(code))

  if (!currencyCodes.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "The store has no supported currencies."
    )
  }

  // ---- One sales channel per brand ----------------------------------------

  const { data: existingChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const missingBrands = BRANDS.filter(
    (brand) => !existingChannels.some((channel) => channel.name === brand.name)
  )

  if (missingBrands.length) {
    await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: missingBrands.map((brand) => ({
          name: brand.name,
          description: brand.description,
        })),
      },
    })
    logger.info(`Created ${missingBrands.length} sales channel(s).`)
  }

  const { data: channels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const channelIdBySlug = new Map<string, string>()

  for (const brand of BRANDS) {
    const channel = channels.find((item) => item.name === brand.name)

    if (!channel) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Sales channel for "${brand.name}" was not created.`
      )
    }

    channelIdBySlug.set(brand.slug, channel.id)
  }

  const brandChannelIds = [...channelIdBySlug.values()]

  // ---- One publishable API key per brand, scoped to its channel -----------

  const { data: existingKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title"],
    filters: { type: "publishable" },
  })

  for (const brand of BRANDS) {
    const title = storefrontKeyTitle(brand)

    if (existingKeys.some((key) => key.title === title)) {
      continue
    }

    const {
      result: [apiKey],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [{ title, type: "publishable", created_by: "" }],
      },
    })

    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: apiKey.id, add: [channelIdBySlug.get(brand.slug)!] },
    })
    logger.info(`Created publishable key "${title}".`)
  }

  // ---- Stock: every brand channel sells from the same warehouse -----------

  const linkedChannelIds = new Set(
    (stockLocation.sales_channels ?? []).map((channel) => channel?.id)
  )
  const unlinkedChannelIds = brandChannelIds.filter(
    (id) => !linkedChannelIds.has(id)
  )

  if (unlinkedChannelIds.length) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocation.id, add: unlinkedChannelIds },
    })
    logger.info(
      `Linked ${unlinkedChannelIds.length} sales channel(s) to the stock location.`
    )
  }

  // ---- Categories, collections and the size option ------------------------

  const categoryNames = Object.values(CATEGORIES)
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  })
  const missingCategories = categoryNames.filter(
    (name) => !existingCategories.some((item) => item.name === name)
  )

  if (missingCategories.length) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingCategories.map((name) => ({
          name,
          is_active: true,
        })),
      },
    })
  }

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  })

  const collectionTitles = Object.values(COLLECTIONS)
  const { data: existingCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "title"],
  })
  const missingCollections = collectionTitles.filter(
    (title) => !existingCollections.some((item) => item.title === title)
  )

  if (missingCollections.length) {
    await createCollectionsWorkflow(container).run({
      input: { collections: missingCollections.map((title) => ({ title })) },
    })
  }

  const { data: collections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "title"],
  })

  const { data: existingOptions } = await query.graph({
    entity: "product_option",
    fields: ["id", "title"],
    filters: { is_exclusive: false },
  })

  if (!existingOptions.some((item) => item.title === SIZE_OPTION)) {
    await createProductOptionsWorkflow(container).run({
      input: { product_options: [{ title: SIZE_OPTION, values: SIZES }] },
    })
  }

  const { data: options } = await query.graph({
    entity: "product_option",
    fields: ["id", "title"],
    filters: { is_exclusive: false },
  })
  const sizeOptionId = options.find((item) => item.title === SIZE_OPTION)?.id

  if (!sizeOptionId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shared option "${SIZE_OPTION}" was not created.`
    )
  }

  // ---- Create the suits ---------------------------------------------------

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["handle"],
  })
  const takenHandles = new Set(existingProducts.map((item) => item.handle))

  const products = SUITS.filter((suit) => !takenHandles.has(suit.handle)).map(
    (suit) => {
      const skuBase = suit.handle.replace(/^[a-z]+-/, "").toUpperCase()

      return {
        title: suit.title,
        handle: suit.handle,
        subtitle: suit.subtitle,
        description: suit.description,
        material: suit.material,
        status: ProductStatus.PUBLISHED,
        thumbnail: image(suit.photo),
        images: [{ url: image(suit.photo) }],
        weight: 1400,
        shipping_profile_id: shippingProfile.id,
        collection_id: collections.find(
          (item) => item.title === COLLECTIONS[suit.collection]
        )?.id,
        category_ids: categories
          .filter((item) => item.name === CATEGORIES[suit.category])
          .map((item) => item.id),
        sales_channels: suit.brands.map((slug) => ({
          id: channelIdBySlug.get(slug)!,
        })),
        options: [{ id: sizeOptionId }],
        variants: SIZES.map((size) => ({
          title: size,
          sku: `${SKU_PREFIX}-${skuBase}-${size}`,
          options: { [SIZE_OPTION]: size },
          prices: currencyCodes.map((currency_code) => ({
            amount: suit.price,
            currency_code,
          })),
        })),
      }
    }
  )

  if (products.length) {
    await createProductsWorkflow(container).run({
      input: { products: products as never },
    })
    logger.info(`Created ${products.length} suit(s).`)
  } else {
    logger.info("All suits already exist.")
  }

  // ---- Keep product <-> brand channel assignments in sync -----------------

  // Covers products that existed before this script ran (or were created by
  // an older version of it): each suit ends up in exactly its brands' channels.
  const { data: catalogue } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "sales_channels.id"],
    filters: { handle: SUITS.map((suit) => suit.handle) },
  })

  for (const channelId of brandChannelIds) {
    const add: string[] = []
    const remove: string[] = []

    for (const product of catalogue) {
      const suit = SUITS.find((item) => item.handle === product.handle)
      const wanted = suit?.brands.some(
        (slug) => channelIdBySlug.get(slug) === channelId
      )
      const linked = (product.sales_channels ?? []).some(
        (channel) => channel?.id === channelId
      )

      if (wanted && !linked) {
        add.push(product.id)
      } else if (!wanted && linked) {
        remove.push(product.id)
      }
    }

    if (add.length || remove.length) {
      await linkProductsToSalesChannelWorkflow(container).run({
        input: { id: channelId, add, remove },
      })
    }
  }

  // ---- Stock for the new variants -----------------------------------------

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku", "location_levels.id"],
  })
  const withoutStock = inventoryItems.filter(
    (item) =>
      item.sku?.startsWith(`${SKU_PREFIX}-`) && !item.location_levels?.length
  )

  if (withoutStock.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: withoutStock.map((item) => ({
          location_id: stockLocation.id,
          stocked_quantity: STOCK_PER_VARIANT,
          inventory_item_id: item.id,
        })),
      },
    })
    logger.info(`Stocked ${withoutStock.length} variant(s).`)
  }

  // ---- Hide the starter's clothing products -------------------------------

  const { data: starterProducts } = await query.graph({
    entity: "product",
    fields: ["id", "status"],
    filters: { handle: STARTER_HANDLES },
  })
  const stillPublished = starterProducts.filter(
    (item) => item.status === ProductStatus.PUBLISHED
  )

  if (stillPublished.length) {
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: stillPublished.map((item) => item.id) },
        update: { status: ProductStatus.DRAFT },
      },
    })
    logger.info(`Moved ${stillPublished.length} starter product(s) to draft.`)
  }

  // ---- Make sure the search index caught up -------------------------------

  // Events are handled asynchronously, so a short-lived `medusa exec` process
  // can exit before ingestion finishes. Same approach as seed-demo-products.
  // On a fresh database the index does not exist yet; the server builds it
  // from all products on its first start, so there is nothing to replay.
  const { data: allProducts } = await query.graph({
    entity: "product",
    fields: ["id"],
  })

  try {
    await container.resolve(Modules.SEARCH).ingest({
      name: "product.updated",
      data: allProducts.map((item) => ({ id: item.id })),
    } as never)
  } catch (error) {
    logger.info(
      `Search index not updated now (${(error as Error).message}). The server indexes all products on start.`
    )
  }

  logger.info(
    `Done. ${BRANDS.length} brands, ${SUITS.length} suits. Each storefront uses its brand's publishable key.`
  )
}
