"use client"

import { useState } from "react"
import { DrawingControls } from "./drawing-controls"
import { HarborCanvas } from "./harbor-canvas"
import { ManagementPanel } from "./management-panel"
import type { AppState, DrawingMode, UserRole } from "@/types"

interface HarborViewProps {
  state: AppState
  updateState: (updates: Partial<AppState>) => void
  drawingMode: DrawingMode
  setDrawingMode: (mode: DrawingMode) => void
  currentUserRole: UserRole
  // Camera controls - now passed from parent
  scale: number
  setScale: (scale: number) => void
  translateX: number
  setTranslateX: (x: number) => void
  translateY: number
  setTranslateY: (y: number) => void
}

export function HarborView({
  state,
  updateState,
  drawingMode,
  setDrawingMode,
  currentUserRole,
  scale,
  setScale,
  translateX,
  setTranslateX,
  translateY,
  setTranslateY,
}: HarborViewProps) {
  const [gridVisible, setGridVisible] = useState(true)
  const [zonesVisible, setZonesVisible] = useState(currentUserRole === "admin") // Standaard aan voor admin, uit voor anderen

  const resetZoom = () => {
    setScale(1)
    setTranslateX(0)
    setTranslateY(0)
  }

  const toggleGrid = () => {
    setGridVisible(!gridVisible)
  }

  const toggleZones = () => {
    setZonesVisible(!zonesVisible)
  }

  return (
    <div className="flex gap-5 w-full h-screen m-0 px-5 box-border">
      {/* Harbor Canvas */}
      <div className="flex-[2] flex flex-col bg-white rounded-lg shadow-lg p-5 h-[90vh] min-h-[600px] min-w-0 overflow-hidden relative">
        <h2 className="text-blue-600 mt-0 pb-2 border-b border-gray-200">
          Havenplan
          {currentUserRole === "viewer" && <span className="text-sm text-gray-500 ml-2">(Alleen lezen)</span>}
          {currentUserRole === "havenmeester" && <span className="text-sm text-blue-500 ml-2">(Zone-beperkt)</span>}
        </h2>

        <DrawingControls
          drawingMode={drawingMode}
          setDrawingMode={setDrawingMode}
          currentUserRole={currentUserRole}
          onResetZoom={resetZoom}
          onToggleGrid={toggleGrid}
          gridVisible={gridVisible}
          state={state}
          updateState={updateState}
          zonesVisible={zonesVisible}
          onToggleZones={toggleZones}
        />

        <div className="bg-sky-300 rounded-lg relative flex flex-col flex-grow h-full w-full overflow-hidden mt-4">
          <HarborCanvas
            state={state}
            updateState={updateState}
            drawingMode={drawingMode}
            currentUserRole={currentUserRole}
            scale={scale}
            setScale={setScale}
            translateX={translateX}
            setTranslateX={setTranslateX}
            translateY={translateY}
            setTranslateY={setTranslateY}
            gridVisible={gridVisible}
            zonesVisible={zonesVisible}
          />
        </div>
      </div>

      {/* Management Panel */}
      {currentUserRole !== "viewer" && (
        <div className="flex-none w-[420px] min-w-[400px] max-w-[500px]">
          <ManagementPanel
            state={state}
            updateState={updateState}
            drawingMode={drawingMode}
            currentUserRole={currentUserRole}
            scale={scale}
            setScale={setScale}
            translateX={translateX}
            setTranslateX={setTranslateX}
            translateY={translateY}
            setTranslateY={setTranslateY}
          />
        </div>
      )}
    </div>
  )
}
