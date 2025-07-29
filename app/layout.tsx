import type React from "react"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { FirebaseStatus } from "@/components/firebase-status"
import { FirebaseSetupGuide } from "@/components/firebase-setup-guide"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body>
        <AuthProvider>
          {children}
          <FirebaseStatus />
          <FirebaseSetupGuide />
        </AuthProvider>
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.dev'
    };
