"use client"

import { useState, useEffect } from "react"
import { useFirebaseContext } from "@/components/auth-provider"
import { ref, onValue, set, off } from "firebase/database"
import { useAuth } from "@/hooks/use-auth"
import type { AppState, Boat, Pier, Slot, Zone } from "@/types"
import { boatTypes, SCALE } from "@/utils/constants"
import { zoneColors, updateBoatZoneId } from "@/utils/zone-helpers"
import { normalizeBoatDimensions } from "@/utils/boat-helpers"

// Demo data als fallback
const createDemoData = (): AppState => {
  const demoZones: Zone[] = [
    {
      id: 1,
      name: "Noord Haven",
      x: 50,
      y: 50,
      width: 400,
      height: 300,
      color: zoneColors[0],
      havenmeesters: [], // Wordt gevuld met echte user UIDs
      description: "Noordelijk deel van de haven",
    },
    {
      id: 2,
      name: "Zuid Haven",
      x: 500,
      y: 200,
      width: 350,
      height: 250,
      color: zoneColors[1],
      havenmeesters: [],
      description: "Zuidelijk deel van de haven",
    },
  ]

  const demoPiers: Pier[] = [
    { id: 1, name: "Steiger A", type: "horizontal", x: 100, y: 200, width: 300, height: 40, zoneId: 1 },
    { id: 2, name: "Steiger B", type: "vertical", x: 600, y: 250, width: 40, height: 200, zoneId: 2 },
  ]

  const demoSlots: Slot[] = [
    {
      id: 1,
      name: "A1",
      x: 120,
      y: 250,
      width: 80,
      height: 120,
      occupied: true,
      boatId: 1,
      orientation: "vertical",
      zoneId: 1,
    },
    {
      id: 2,
      name: "A2",
      x: 220,
      y: 250,
      width: 80,
      height: 120,
      occupied: false,
      boatId: null,
      orientation: "vertical",
      zoneId: 1,
    },
    {
      id: 3,
      name: "B1",
      x: 650,
      y: 270,
      width: 120,
      height: 80,
      occupied: true,
      boatId: 2,
      orientation: "horizontal",
      zoneId: 2,
    },
  ]

  const demoBoats: (Boat & { widthInMeters: number })[] = [
    {
      id: 1,
      name: "Demo Zeilboot",
      type: "sailboat",
      size: 12, // 12 meter lang
      owner: "Jan Janssen",
      phone: "06-12345678",
      email: "jan@demo.nl",
      slotId: 1,
      x: 120,
      y: 250,
      width: 3.5 * SCALE, // 3.5m breed = 17.5 pixels (visuele width omdat slot vertical is)
      height: 12 * SCALE, // 12m lang = 60 pixels (visuele height omdat slot vertical is)
      color: boatTypes.sailboat.color,
      typeName: boatTypes.sailboat.name,
      zoneId: 1,
      widthInMeters: 3.5, // Werkelijke breedte: 3.5 meter
    },
    {
      id: 2,
      name: "Demo Motorboot",
      type: "motorboat",
      size: 8, // 8 meter lang
      owner: "Piet Pietersen",
      phone: "06-87654321",
      email: "piet@demo.nl",
      slotId: 3,
      x: 650,
      y: 270,
      width: 8 * SCALE, // 8m lang = 40 pixels (visuele width omdat slot horizontal is)
      height: 2.0 * SCALE, // 2m breed = 10 pixels (visuele height omdat slot horizontal is)
      color: boatTypes.motorboat.color,
      typeName: boatTypes.motorboat.name,
      zoneId: 2,
      widthInMeters: 2.0, // Werkelijke breedte: 2.0 meter (smaller for testing)
    },
  ]

  return {
    piers: demoPiers,
    slots: demoSlots,
    boats: demoBoats as Boat[],
    zones: demoZones,
    nextPierId: 3,
    nextSlotId: 4,
    nextBoatId: 3,
    nextZoneId: 3,
    selectedPier: null,
    selectedSlot: null,
    selectedBoat: null,
    selectedZone: null,
  }
}

// Helper function to clean data for Firebase (remove undefined values)
function cleanDataForFirebase(data: any): any {
  if (Array.isArray(data)) {
    return data.map(cleanDataForFirebase)
  } else if (data !== null && typeof data === "object") {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanDataForFirebase(value)
      }
    }
    return cleaned
  }
  return data
}

// Functie om boten te migreren naar nieuwe format met widthInMeters en genormaliseerde afmetingen
const migrateBoatsFormat = (boats: any[]): Boat[] => {
  return boats.map((boat) => {
    // Voeg widthInMeters toe als het ontbreekt
    const boatWithMetrics = {
      ...boat,
      widthInMeters: (boat as any).widthInMeters || boat.width / SCALE,
    }

    // Normaliseer de afmetingen om ervoor te zorgen dat ze consistent zijn
    return normalizeBoatDimensions(boatWithMetrics)
  })
}

export function useFirebase() {
  const { database, isConnected } = useFirebaseContext()
  const { user, userProfile, loading: authLoading } = useAuth()
  const [state, setState] = useState<AppState>(createDemoData())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsFirebaseSetup, setNeedsFirebaseSetup] = useState(false)
  const [usingDemoData, setUsingDemoData] = useState(true)

  // Debug Firebase connection status
  useEffect(() => {
    console.log("🔍 Firebase Debug Info:", {
      database: !!database,
      isConnected,
      hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      hasDatabaseUrl: !!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      environmentVariables: {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "✅ Set" : "❌ Missing",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "✅ Set" : "❌ Missing",
        databaseUrl: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ? "✅ Set" : "❌ Missing",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "✅ Set" : "❌ Missing",
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? "✅ Set" : "❌ Missing",
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? "✅ Set" : "❌ Missing",
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "✅ Set" : "❌ Missing",
      },
    })
  }, [database, isConnected])

  useEffect(() => {
    // Check if Firebase environment variables are missing
    const requiredEnvVars = [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      "NEXT_PUBLIC_FIREBASE_APP_ID",
    ]

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

    if (missingVars.length > 0) {
      console.error("❌ Missing Firebase environment variables:", missingVars)
      console.log("💡 To fix this:")
      console.log("1. Create a .env.local file in your project root")
      console.log("2. Add the missing environment variables:")
      missingVars.forEach((varName) => {
        console.log(`   ${varName}=your_value_here`)
      })
      console.log("3. Restart your development server")

      setNeedsFirebaseSetup(true)
      setUsingDemoData(true)
      setLoading(false)
      return
    }

    if (!database || !isConnected) {
      console.log("🔥 Firebase not ready, using demo data")
      console.log("Reasons:")
      console.log("- Database object:", !!database)
      console.log("- Is connected:", isConnected)
      setLoading(false)
      setUsingDemoData(true)
      return
    }

    console.log("🔥 Attempting to connect to Firebase...")
    setLoading(true)
    setError(null)

    // Simple connection test
    const testRef = ref(database, "boats")
    let hasConnected = false

    const handleConnectionSuccess = () => {
      if (hasConnected) return
      hasConnected = true

      console.log("✅ Firebase connection successful!")
      setNeedsFirebaseSetup(false)
      setUsingDemoData(false)

      // Set up all listeners after successful connection
      setupAllListeners()
    }

    const handleConnectionError = (error: any) => {
      if (hasConnected) return

      console.error("❌ Firebase connection failed:", error)
      console.log("Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack,
      })

      if (error.code === "PERMISSION_DENIED") {
        console.log("🔒 Permission denied - Firebase Database Rules need to be updated")
        console.log("💡 Go to Firebase Console > Realtime Database > Rules and update them")
        setNeedsFirebaseSetup(true)
        setUsingDemoData(true)
        setError("Firebase Database Rules moeten worden bijgewerkt")
      } else {
        console.log("🔥 Other Firebase error - falling back to demo data")
        setError(`Firebase fout: ${error.message}`)
        setUsingDemoData(true)
      }
      setLoading(false)
    }

    const setupAllListeners = () => {
      const cleanupFunctions: (() => void)[] = []

      // Zones listener
      const zonesRef = ref(database, "zones")
      const zonesUnsubscribe = onValue(
        zonesRef,
        (snapshot) => {
          const data = snapshot.val()
          console.log("📊 Zones data received:", data)
          if (data) {
            const zonesArray = Array.isArray(data) ? data : Object.values(data)
            setState((prev) => ({
              ...prev,
              zones: zonesArray,
              nextZoneId: zonesArray.length > 0 ? Math.max(...zonesArray.map((z: any) => z.id || 0)) + 1 : 1,
            }))
          } else {
            console.log("📊 No zones data found, using empty array")
            setState((prev) => ({
              ...prev,
              zones: [],
              nextZoneId: 1,
            }))
          }
        },
        (error) => {
          console.error("❌ Zones listener error:", error)
        },
      )
      cleanupFunctions.push(() => {
        off(zonesRef)
        zonesUnsubscribe()
      })

      // Piers listener
      const piersRef = ref(database, "piers")
      const piersUnsubscribe = onValue(
        piersRef,
        (snapshot) => {
          const data = snapshot.val()
          console.log("🏗️ Piers data received:", data)
          if (data) {
            const piersArray = Array.isArray(data) ? data : Object.values(data)
            setState((prev) => ({
              ...prev,
              piers: piersArray,
              nextPierId: piersArray.length > 0 ? Math.max(...piersArray.map((p: any) => p.id || 0)) + 1 : 1,
            }))
          } else {
            console.log("🏗️ No piers data found, using empty array")
            setState((prev) => ({
              ...prev,
              piers: [],
              nextPierId: 1,
            }))
          }
        },
        (error) => {
          console.error("❌ Piers listener error:", error)
        },
      )
      cleanupFunctions.push(() => {
        off(piersRef)
        piersUnsubscribe()
      })

      // Slots listener
      const slotsRef = ref(database, "slots")
      const slotsUnsubscribe = onValue(
        slotsRef,
        (snapshot) => {
          const data = snapshot.val()
          console.log("⚓ Slots data received:", data)
          if (data) {
            const slotsArray = Array.isArray(data) ? data : Object.values(data)
            setState((prev) => ({
              ...prev,
              slots: slotsArray,
              nextSlotId: slotsArray.length > 0 ? Math.max(...slotsArray.map((s: any) => s.id || 0)) + 1 : 1,
            }))
          } else {
            console.log("⚓ No slots data found, using empty array")
            setState((prev) => ({
              ...prev,
              slots: [],
              nextSlotId: 1,
            }))
          }
        },
        (error) => {
          console.error("❌ Slots listener error:", error)
        },
      )
      cleanupFunctions.push(() => {
        off(slotsRef)
        slotsUnsubscribe()
      })

      // Boats listener
      const boatsRef = ref(database, "boats")
      const boatsUnsubscribe = onValue(
        boatsRef,
        (snapshot) => {
          const data = snapshot.val()
          console.log("🚤 Boats data received:", data)
          if (data) {
            const boatsArray = Array.isArray(data) ? data : Object.values(data)
            const migratedBoats = migrateBoatsFormat(boatsArray)

            setState((prev) => {
              // Update boats with correct zone IDs based on current zones
              const updatedBoats = migratedBoats.map((boat) => updateBoatZoneId(boat, prev.zones))

              return {
                ...prev,
                boats: updatedBoats,
                nextBoatId: updatedBoats.length > 0 ? Math.max(...updatedBoats.map((b: any) => b.id || 0)) + 1 : 1,
              }
            })
          } else {
            console.log("🚤 No boats data found, using empty array")
            setState((prev) => ({
              ...prev,
              boats: [],
              nextBoatId: 1,
            }))
          }
          setLoading(false)
        },
        (error) => {
          console.error("❌ Boats listener error:", error)
          setLoading(false)
        },
      )
      cleanupFunctions.push(() => {
        off(boatsRef)
        boatsUnsubscribe()
      })

      return () => {
        cleanupFunctions.forEach((cleanup) => cleanup())
      }
    }

    // Start with a simple test
    console.log("🧪 Testing Firebase connection...")
    const testUnsubscribe = onValue(testRef, handleConnectionSuccess, handleConnectionError)

    return () => {
      off(testRef)
      testUnsubscribe()
    }
  }, [database, isConnected])

  const updateState = async (updates: Partial<AppState>) => {
    // Als boten worden geüpdatet, normaliseer hun afmetingen en update zone IDs
    if (updates.boats) {
      const currentZones = updates.zones || state.zones
      const normalizedBoats = updates.boats.map(normalizeBoatDimensions)
      updates.boats = normalizedBoats.map((boat) => updateBoatZoneId(boat, currentZones))
    }

    setState((prev) => ({ ...prev, ...updates }))

    if (database && isConnected && user && !usingDemoData) {
      try {
        const promises = []

        if (updates.zones) {
          const cleanedZones = cleanDataForFirebase(updates.zones)
          promises.push(set(ref(database, "zones"), cleanedZones))
        }
        if (updates.piers) {
          const cleanedPiers = cleanDataForFirebase(updates.piers)
          promises.push(set(ref(database, "piers"), cleanedPiers))
        }
        if (updates.slots) {
          const cleanedSlots = cleanDataForFirebase(updates.slots)
          promises.push(set(ref(database, "slots"), cleanedSlots))
        }
        if (updates.boats) {
          const cleanedBoats = cleanDataForFirebase(updates.boats)
          promises.push(set(ref(database, "boats"), cleanedBoats))
        }

        await Promise.all(promises)
        console.log("✅ Data saved to Firebase")
      } catch (error: any) {
        console.error("❌ Error saving to Firebase:", error)
        setError(`Fout bij opslaan: ${error.message}`)
      }
    } else {
      console.log("💾 Not saving to Firebase:", {
        hasDatabase: !!database,
        isConnected,
        hasUser: !!user,
        usingDemoData,
      })
    }
  }

  return {
    state,
    updateState,
    loading,
    error,
    needsFirebaseSetup,
    usingDemoData,
    isConnected: database && isConnected,
  }
}
