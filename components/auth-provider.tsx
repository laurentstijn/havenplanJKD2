"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { initializeApp } from "firebase/app"
import { getDatabase, type Database, connectDatabaseEmulator } from "firebase/database"
import { getAuth, type Auth, connectAuthEmulator } from "firebase/auth"

// Firebase configuratie - gebruik de environment variables die al beschikbaar zijn
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyARI_0oTGyEkKSpXaHD74UcatqML2C3SEM",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "testenhavenplan.firebaseapp.com",
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    "https://testenhavenplan-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "testenhavenplan",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "testenhavenplan.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "272036960488",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:272036960488:web:ee3e446163bb21a140d15d",
}

interface FirebaseContextType {
  database: Database | null
  auth: Auth | null
  isConnected: boolean
  error: string | null
}

const FirebaseContext = createContext<FirebaseContextType>({
  database: null,
  auth: null,
  isConnected: false,
  error: null,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebase, setFirebase] = useState<FirebaseContextType>({
    database: null,
    auth: null,
    isConnected: false,
    error: null,
  })

  useEffect(() => {
    console.log("Firebase Config:", {
      apiKey: firebaseConfig.apiKey ? "✓ Set" : "✗ Missing",
      authDomain: firebaseConfig.authDomain ? "✓ Set" : "✗ Missing",
      databaseURL: firebaseConfig.databaseURL ? "✓ Set" : "✗ Missing",
      projectId: firebaseConfig.projectId ? "✓ Set" : "✗ Missing",
    })

    try {
      const app = initializeApp(firebaseConfig)
      const database = getDatabase(app)
      const auth = getAuth(app)

      // Controleer of we emulator moeten gebruiken
      const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"

      if (useEmulator && typeof window !== "undefined") {
        try {
          // Database emulator
          const dbEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST
          if (dbEmulatorHost && !database._delegate._repoInternal) {
            const [host, port] = dbEmulatorHost.split(":")
            connectDatabaseEmulator(database, host, Number.parseInt(port))
            console.log("✓ Connected to Database Emulator")
          }

          // Auth emulator
          const authEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST
          if (authEmulatorHost && !(auth as any)._delegate.emulatorConfig) {
            const authEmulatorUrl = `http://${authEmulatorHost}`
            connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true })
            console.log("✓ Connected to Auth Emulator")
          }
        } catch (emulatorError) {
          console.log("Emulator connection failed, using production Firebase:", emulatorError)
        }
      }

      setFirebase({
        database,
        auth,
        isConnected: true,
        error: null,
      })

      console.log("✓ Firebase initialized successfully")
    } catch (error) {
      console.error("Firebase initialization failed:", error)
      setFirebase({
        database: null,
        auth: null,
        isConnected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }, [])

  return <FirebaseContext.Provider value={firebase}>{children}</FirebaseContext.Provider>
}

export const useFirebaseContext = () => useContext(FirebaseContext)
