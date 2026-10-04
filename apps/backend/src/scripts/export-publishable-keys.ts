/**
 * Writes each brand's publishable API key to `<dir>/<brand slug>` so the
 * storefront containers can pick them up without anyone copying keys out of
 * the admin. Publishable keys are public by design (they ship to browsers).
 *
 *   PUBLISHABLE_KEY_DIR=/shared/keys \
 *     medusa exec ./src/scripts/export-publishable-keys.js
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { BRANDS, storefrontKeyTitle } from "../lib/brands"

export default async function exportPublishableKeys({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const dir = process.env.PUBLISHABLE_KEY_DIR

  if (!dir) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PUBLISHABLE_KEY_DIR is not set."
    )
  }

  const { data: keys } = await query.graph({
    entity: "api_key",
    fields: ["title", "token", "revoked_at"],
    filters: { type: "publishable" },
  })

  mkdirSync(dir, { recursive: true })

  for (const brand of BRANDS) {
    const key = keys.find(
      (item) => item.title === storefrontKeyTitle(brand) && !item.revoked_at
    )

    if (!key?.token) {
      logger.warn(
        `No publishable key for "${brand.name}". Run seed-brands first.`
      )
      continue
    }

    writeFileSync(join(dir, brand.slug), key.token)
    logger.info(`Publishable key for "${brand.name}" written to ${dir}`)
  }
}
