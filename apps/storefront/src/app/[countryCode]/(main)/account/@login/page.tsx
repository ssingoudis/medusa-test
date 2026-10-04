import { STORE_NAME } from "@lib/store-name"
import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in to your ${STORE_NAME} account.`,
}

export default function Login() {
  return <LoginTemplate />
}
