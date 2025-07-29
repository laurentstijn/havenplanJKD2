"use client"

import { useState, useEffect } from "react"
import { HarborView } from "@/components/harbor-view"
import { AuthContainer } from "@/components/auth-container"
import { AuthProvider } from "@/components/auth-provider"
import { FirebaseSetupUrgent } from "@/components/firebase-setup-urgent"
import { useAuth } from "@/hooks/use-auth"
import { useFirebase } from "@/hooks/use-firebase"
import { getUserZones } from "@/utils/zone-helpers"
import type { DrawingMode, UserRole, Zone } from "@/types"

function AppContent() {
  const { userProfile, loading: authLoading, user } = useAuth()
  const { state, updateState, loading: dataLoading, needsFirebaseSetup, usingDemoData } = useFirebase()
  const [drawingMode, setDrawingMode] = useState<DrawingMode>("select")
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("viewer")

  // Camera controls
  const [scale, setScale] = useState(1)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)

  // Track if we've already centered for this user session
  const [hasCenteredForUser, setHasCenteredForUser] = useState(false)

  // Update role when user profile changes
  useEffect(() => {
    if (userProfile) {
      setCurrentUserRole(userProfile.role)
    } else {
      setCurrentUserRole("viewer")
      setHasCenteredForUser(false) // Reset when user logs out
    }
  }, [userProfile])

  // Function to center camera on zones
  const centerOnZones = (zones: Zone[]) => {
    if (zones.length === 0) return

    console.log(
      `🎯 Centering on ${zones.length} zones:`,
      zones.map((z) => z.name),
    )

    // Calculate bounding box of all assigned zones
    let minX = Number.MAX_VALUE
    let minY = Number.MAX_VALUE
    let maxX = Number.MIN_VALUE
    let maxY = Number.MIN_VALUE

    zones.forEach((zone) => {
      minX = Math.min(minX, zone.x)
      minY = Math.min(minY, zone.y)
      maxX = Math.max(maxX, zone.x + zone.width)
      maxY = Math.max(maxY, zone.y + zone.height)
      console.log(`Zone "${zone.name}": x=${zone.x}, y=${zone.y}, w=${zone.width}, h=${zone.height}`)
    })

    // Calculate center point
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    console.log(`📍 Calculated center: x=${centerX}, y=${centerY}`)

    // Calculate required scale to fit all zones with some padding
    const viewportWidth = 800 // Estimated canvas width
    const viewportHeight = 600 // Estimated canvas height
    const padding = 100 // More padding around zones

    const zoneWidth = maxX - minX + padding * 2
    const zoneHeight = maxY - minY + padding * 2

    const scaleX = viewportWidth / zoneWidth
    const scaleY = viewportHeight / zoneHeight
    const targetScale = Math.min(scaleX, scaleY, 1.5) // Lower max zoom for better overview

    // Calculate translate to center the zones
    const newTranslateX = viewportWidth / 2 - centerX * targetScale
    const newTranslateY = viewportHeight / 2 - centerY * targetScale

    console.log(`🔍 Setting scale: ${targetScale}, translate: x=${newTranslateX}, y=${newTranslateY}`)

    // Apply the new camera position
    setScale(targetScale)
    setTranslateX(newTranslateX)
    setTranslateY(newTranslateY)

    console.log(`✅ Camera centered on zones for havenmeester`)
  }

  // Auto-center for havenmeester when data loads
  useEffect(() => {
    console.log("🔍 Checking auto-center conditions:", {
      dataLoading,
      userRole: userProfile?.role,
      hasCenteredForUser,
      zonesCount: state.zones.length,
      userUid: user?.uid,
      userProfileUid: userProfile?.uid,
    })

    // Only run this effect when:
    // 1. Data is loaded (not loading)
    // 2. User is a havenmeester
    // 3. We haven't centered for this user yet
    // 4. We have zones data
    if (
      !dataLoading &&
      userProfile?.role === "havenmeester" &&
      !hasCenteredForUser &&
      state.zones.length > 0 &&
      user?.uid
    ) {
      console.log("🏢 Getting zones for havenmeester:", user.uid)

      // Debug: Show all zones and their havenmeesters
      state.zones.forEach((zone) => {
        console.log(`Zone "${zone.name}":`, {
          id: zone.id,
          havenmeesters: zone.havenmeesters || [],
          hasCurrentUser: (zone.havenmeesters || []).includes(user.uid),
        })
      })

      const userZones = getUserZones(user.uid, state.zones)
      console.log(
        "📋 Found user zones:",
        userZones.map((z) => z.name),
      )

      if (userZones.length > 0) {
        // Small delay to ensure UI is ready
        setTimeout(() => {
          centerOnZones(userZones)
          setHasCenteredForUser(true)

          // Show notification
          const zoneNames = userZones.map((z) => z.name).join(", ")
          console.log(`🏢 Havenmeester "${userProfile.displayName}" toegewezen aan zone(s): ${zoneNames}`)
        }, 500)
      } else {
        console.log(`⚠️ Havenmeester "${userProfile.displayName}" heeft geen toegewezen zones`)

        // FOR DEMO: If no zones assigned, assign to first zone automatically
        if (usingDemoData && state.zones.length > 0) {
          console.log("🧪 DEMO MODE: Auto-assigning havenmeester to first zone")
          const firstZone = state.zones[0]
          const updatedZone = {
            ...firstZone,
            havenmeesters: [...(firstZone.havenmeesters || []), user.uid],
          }
          const updatedZones = state.zones.map((z) => (z.id === firstZone.id ? updatedZone : z))

          updateState({ zones: updatedZones })

          // Don't set hasCenteredForUser yet, let it trigger again with the updated zones
          return
        }

        setHasCenteredForUser(true) // Don't try again
      }
    }
  }, [dataLoading, userProfile, hasCenteredForUser, state.zones, user?.uid, usingDemoData, updateState])

  // Reset centering flag when user changes
  useEffect(() => {
    setHasCenteredForUser(false)
  }, [user?.uid])

  // Show Firebase setup if needed
  if (needsFirebaseSetup) {
    return (
      <div className="min-h-screen bg-blue-50">
        <FirebaseSetupUrgent isVisible={true} />
      </div>
    )
  }

  // Show loading state
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-blue-600 mb-2">Jachthaven Beheersysteem</h2>
          <p className="text-gray-600">{usingDemoData ? "Demo data laden..." : "Havenplan laden..."}</p>
          <div className="mt-4 text-sm text-gray-500">
            📊 Boten: {state.boats.length} | Steigers: {state.piers.length} | Ligplaatsen: {state.slots.length}
          </div>
        </div>
      </div>
    )
  }

  const currentUserZones = user?.uid ? getUserZones(user.uid, state.zones) : []

  return (
    <div className="text-gray-600 bg-white px-3 py-2 rounded-lg shadow-sm text-xs">
      <AuthContainer currentUserRole={currentUserRole} onRoleChange={setCurrentUserRole} />

      {/* Demo data warning */}
      {usingDemoData && (
        <div className="bg-yellow-100 border-b border-yellow-300 p-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <span className="font-bold text-yellow-800">Demo Modus Actief</span>
                <span className="text-yellow-700 text-sm ml-2">
                  - Je ziet nu demo data. Voor echte data moet Firebase worden ingesteld.
                </span>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700 transition-colors"
            >
              🔧 Firebase Setup
            </button>
          </div>
        </div>
      )}

      {/* Havenmeester zone notification */}
      {userProfile?.role === "havenmeester" && (
        <div className="bg-blue-100 border-b border-blue-300 p-2">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-blue-600">⚓</span>
              {currentUserZones.length > 0 ? (
                <span className="font-medium text-blue-800">
                  Havenmeester toegang - Camera gecentreerd op: {currentUserZones.map((z) => z.name).join(", ")}
                </span>
              ) : (
                <span className="font-medium text-orange-800">
                  Havenmeester toegang - Geen zones toegewezen
                  {usingDemoData && <span className="text-blue-600 ml-2">(wordt automatisch toegewezen in demo)</span>}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Debug info for development */}
      {process.env.NODE_ENV === "development" && userProfile?.role === "havenmeester" && (
        <div className="bg-gray-100 border-b border-gray-300 p-2 text-xs">
          <div className="max-w-7xl mx-auto">
            <strong>🐛 Debug Info:</strong> User UID: {user?.uid} | Zones: {state.zones.length} | Assigned:{" "}
            {currentUserZones.length} | Camera: scale={scale.toFixed(2)}, x={translateX.toFixed(0)}, y=
            {translateY.toFixed(0)}
          </div>
        </div>
      )}

      <HarborView
        state={state}
        updateState={updateState}
        drawingMode={drawingMode}
        setDrawingMode={setDrawingMode}
        currentUserRole={currentUserRole}
        scale={scale}
        setScale={setScale}
        translateX={translateX}
        setTranslateX={setTranslateX}
        translateY={translateY}
        setTranslateY={setTranslateY}
      />

      {/* Status indicator */}
      <div className="fixed bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg border text-sm">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              usingDemoData ? "bg-yellow-500" : userProfile ? "bg-green-500" : "bg-blue-500"
            }`}
          ></div>
          <span className="font-medium">
            {usingDemoData
              ? "Demo Modus"
              : userProfile
                ? `Ingelogd als ${userProfile.displayName}`
                : "Publieke toegang"}
          </span>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          📊 Boten: {state.boats.length} | Steigers: {state.piers.length} | Ligplaatsen: {state.slots.length}
          {usingDemoData && <span className="text-yellow-600"> (Demo)</span>}
        </div>
        {!userProfile && !usingDemoData && (
          <div className="text-xs text-blue-600 mt-1">💡 Log in om boten te kunnen bewerken</div>
        )}
        {usingDemoData && <div className="text-xs text-yellow-600 mt-1">⚠️ Wijzigingen worden niet opgeslagen</div>}

        {/* Show zone info for havenmeester */}
        {userProfile?.role === "havenmeester" && (
          <div className="text-xs text-blue-600 mt-1">
            ⚓ Zones: {currentUserZones.length} toegewezen
            {currentUserZones.length > 0 && (
              <span className="text-gray-500"> ({currentUserZones.map((z) => z.name).join(", ")})</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
