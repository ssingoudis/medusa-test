/**
 * Shop branding. One storefront codebase serves several brands; each
 * deployment sets its own name and tagline (and its own publishable key).
 */
const DEFAULT_STORE_NAME = "Medusa Store"

export const STORE_NAME =
  process.env.NEXT_PUBLIC_STORE_NAME || DEFAULT_STORE_NAME

export const STORE_TAGLINE = process.env.NEXT_PUBLIC_STORE_TAGLINE || ""

/** False while the starter's default branding is in use. */
export const IS_BRANDED = STORE_NAME !== DEFAULT_STORE_NAME
