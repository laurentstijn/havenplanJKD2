"use client"

import { useState } from "react"
import { BoatPopup } from "./boat-popup"
import type { DrawingMode, UserRole, AppState, Boat } from "@/types"
import { useAuth } from "@/hooks/use-auth"

interface DrawingControlsProps {
  drawingMode: DrawingMode
  setDrawingMode: (mode: DrawingMode) => void
  currentUserRole: UserRole
  onResetZoom: () => void
  onToggleGrid: () => void
  gridVisible: boolean
  state: AppState
  updateState: (updates: Partial<AppState>) => void
  zonesVisible: boolean
  onToggleZones: () => void
}

export function DrawingControls({
  drawingMode,
  setDrawingMode,
  currentUserRole,
  onResetZoom,
  onToggleGrid,
  gridVisible,
  state,
  updateState,
  zonesVisible,
  onToggleZones,
}: DrawingControlsProps) {
  const { user } = useAuth()
  const [showBoatPopup, setShowBoatPopup] = useState(false)
  const isViewer = currentUserRole === "viewer"

  const handleAddBoat = (boatData: Omit<Boat, "id">) => {
    // Bepaal positie op basis van gebruikersrol
    let boatX = boatData.x
    let boatY = boatData.y
    let targetZoneId: number | undefined

    if (currentUserRole === "havenmeester" && user?.uid) {
      // Voor havenmeesters: probeer boot in hun zone te plaatsen
      const userZones = state.zones.filter((zone) => zone.havenmeesters && zone.havenmeesters.includes(user.uid))

      if (userZones.length > 0) {
        const firstZone = userZones[0]
        // Plaats boot in het centrum van de zone
        boatX = firstZone.x + firstZone.width / 2 - boatData.width / 2
        boatY = firstZone.y + firstZone.height / 2 - boatData.height / 2
        targetZoneId = firstZone.id

        console.log(`🏢 Havenmeester boot geplaatst in zone "${firstZone.name}" op (${boatX}, ${boatY})`)
      }
    }

    const newBoat: Boat = {
      ...boatData,
      id: state.nextBoatId,
      x: boatX,
      y: boatY,
      zoneId: targetZoneId,
    }

    updateState({
      boats: [...state.boats, newBoat],
      nextBoatId: state.nextBoatId + 1,
      selectedBoat: newBoat,
    })
  }

  return (
    <>
      <div className="flex gap-2 mb-4 flex-wrap">
        {!isViewer && (
          <button
            className={`py-2 px-4 text-white border-none rounded cursor-pointer text-sm transition-colors ${
              drawingMode === "select"
                ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-300"
                : "bg-gray-600 hover:bg-gray-700"
            }`}
            onClick={() => setDrawingMode("select")}
          >
            ✋ Selectie Modus
          </button>
        )}

        {currentUserRole === "admin" && (
          <>
            <button
              className={`py-2 px-4 text-white border-none rounded cursor-pointer text-sm transition-colors ${
                drawingMode === "zone"
                  ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-300"
                  : "bg-gray-600 hover:bg-gray-700"
              }`}
              onClick={() => setDrawingMode("zone")}
            >
              🏢 Zone Modus
            </button>

            <button
              className={`py-2 px-4 text-white border-none rounded cursor-pointer text-sm transition-colors ${
                drawingMode === "pier"
                  ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-300"
                  : "bg-gray-600 hover:bg-gray-700"
              }`}
              onClick={() => setDrawingMode("pier")}
            >
              🏗️ Steiger Modus
            </button>

            <button
              className={`py-2 px-4 text-white border-none rounded cursor-pointer text-sm transition-colors ${
                drawingMode === "slot"
                  ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-300"
                  : "bg-gray-600 hover:bg-gray-700"
              }`}
              onClick={() => setDrawingMode("slot")}
            >
              ⚓ Ligplaats Modus
            </button>
          </>
        )}

        {!isViewer && (
          <button
            className="py-2 px-4 text-white border-none rounded cursor-pointer text-sm transition-colors bg-green-600 hover:bg-green-700"
            onClick={() => setShowBoatPopup(true)}
          >
            🚤 Boot Toevoegen
          </button>
        )}

        <div className="border-l border-gray-300 mx-2"></div>

        <button
          className="py-2 px-4 text-white border-none rounded cursor-pointer text-sm transition-colors bg-gray-600 hover:bg-gray-700"
          onClick={onResetZoom}
        >
          🔍 Reset Zoom
        </button>

        <button
          className="py-2 px-4 text-white border-none rounded cursor-pointer text-sm transition-colors bg-gray-600 hover:bg-gray-700"
          onClick={onToggleGrid}
        >
          {gridVisible ? "🔲" : "⬜"} Raster {gridVisible ? "Uit" : "Aan"}
        </button>

        {/* Zone visibility toggle - alleen voor admins */}
        {currentUserRole === "admin" && (
          <button
            className={`py-2 px-4 text-white border-none rounded cursor-pointer text-sm transition-colors ${
              zonesVisible ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-600 hover:bg-gray-700"
            }`}
            onClick={onToggleZones}
            title="Zones tonen/verbergen"
          >
            {zonesVisible ? "🏢" : "🏢"} Zones {zonesVisible ? "Aan" : "Uit"}
          </button>
        )}

        {drawingMode === "select" && !isViewer && (
          <div className="text-sm text-gray-600 self-center ml-2 bg-yellow-100 px-2 py-1 rounded">
            💡 Sleep boten, steigers en ligplaatsen om ze te verplaatsen
          </div>
        )}

        {drawingMode === "zone" && currentUserRole === "admin" && (
          <div className="text-sm text-gray-600 self-center ml-2 bg-purple-100 px-2 py-1 rounded">
            🏢 Sleep om een nieuwe zone te tekenen
          </div>
        )}

        {/* Havenmeester info over zone toegang */}
        {currentUserRole === "havenmeester" && (
          <div className="text-sm text-blue-600 self-center ml-2 bg-blue-100 px-2 py-1 rounded">
            ⚓ Je kunt alleen boten in jouw toegewezen zones bewerken
          </div>
        )}
      </div>

      <BoatPopup
        isOpen={showBoatPopup}
        onClose={() => setShowBoatPopup(false)}
        onAddBoat={handleAddBoat}
        nextBoatId={state.nextBoatId}
        availableSlots={state.slots}
      />
    </>
  )
}
