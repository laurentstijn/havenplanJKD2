"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import type { AppState, DrawingMode, UserRole, Pier, Slot, Zone } from "@/types"
import { snapToGrid } from "@/utils/constants"
import { canEditBoat, findBoatZone } from "@/utils/zone-helpers"
import { useAuth } from "@/hooks/use-auth"

interface HarborCanvasProps {
  state: AppState
  updateState: (updates: Partial<AppState>) => void
  drawingMode: DrawingMode
  currentUserRole: UserRole
  scale: number
  setScale: (scale: number) => void
  translateX: number
  setTranslateX: (x: number) => void
  translateY: number
  setTranslateY: (y: number) => void
  gridVisible: boolean
  zonesVisible: boolean
}

export function HarborCanvas({
  state,
  updateState,
  drawingMode,
  currentUserRole,
  scale,
  setScale,
  translateX,
  setTranslateX,
  translateY,
  setTranslateY,
  gridVisible,
  zonesVisible,
}: HarborCanvasProps) {
  const { user } = useAuth()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tempElement, setTempElement] = useState<any>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })

  // Dragging state
  const [isDragging, setIsDragging] = useState(false)
  const [dragTarget, setDragTarget] = useState<{
    type: string
    id: number
    action: "move" | "resize"
    handle?: string
  } | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0, x: 0, y: 0 })

  // Touch zoom state
  const [isZooming, setIsZooming] = useState(false)
  const [initialDistance, setInitialDistance] = useState(0)
  const [initialScale, setInitialScale] = useState(1)
  const [zoomCenter, setZoomCenter] = useState({ x: 0, y: 0 })

  // Touch selection state
  const [touchStartTime, setTouchStartTime] = useState(0)
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 })

  // Helper function to calculate distance between two touch points
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Helper function to get center point between two touches
  const getTouchCenter = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    }
  }

  // Replace the updateTransform useCallback with direct style updates
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`
    }
  }, [scale, translateX, translateY])

  // Global mouse move and up handlers for dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const deltaX = e.clientX - startPos.x
        const deltaY = e.clientY - startPos.y
        setTranslateX(translateX + deltaX)
        setTranslateY(translateY + deltaY)
        setStartPos({ x: e.clientX, y: e.clientY }) // Update start position for continuous panning
        return
      }

      if (isDragging && dragTarget && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const mouseX = (e.clientX - rect.left - translateX) / scale
        const mouseY = (e.clientY - rect.top - translateY) / scale

        if (dragTarget.action === "move") {
          const newX = snapToGrid(mouseX - dragOffset.x)
          const newY = snapToGrid(mouseY - dragOffset.y)

          if (dragTarget.type === "boat") {
            const boat = state.boats.find((b) => b.id === dragTarget.id)
            if (boat && canEditBoat(user?.uid || "", boat, state.zones, currentUserRole)) {
              const updatedBoats = state.boats.map((boat) =>
                boat.id === dragTarget.id ? { ...boat, x: newX, y: newY } : boat,
              )
              updateState({ boats: updatedBoats })
            }
          } else if (dragTarget.type === "pier") {
            const updatedPiers = state.piers.map((pier) =>
              pier.id === dragTarget.id ? { ...pier, x: newX, y: newY } : pier,
            )
            updateState({ piers: updatedPiers })
          } else if (dragTarget.type === "slot") {
            const updatedSlots = state.slots.map((slot) =>
              slot.id === dragTarget.id ? { ...slot, x: newX, y: newY } : slot,
            )
            updateState({ slots: updatedSlots })
          } else if (dragTarget.type === "zone") {
            const updatedZones = state.zones.map((zone) =>
              zone.id === dragTarget.id ? { ...zone, x: newX, y: newY } : zone,
            )
            updateState({ zones: updatedZones })
          }
        } else if (dragTarget.action === "resize") {
          // Handle resizing
          const deltaX = mouseX - (originalSize.x + dragOffset.x)
          const deltaY = mouseY - (originalSize.y + dragOffset.y)

          let newWidth = originalSize.width
          let newHeight = originalSize.height
          let newX = originalSize.x
          let newY = originalSize.y

          // Calculate new dimensions based on resize handle
          switch (dragTarget.handle) {
            case "se": // Southeast (bottom-right)
              newWidth = Math.max(10, snapToGrid(originalSize.width + deltaX)) // Verlaagd van 20 naar 10
              newHeight = Math.max(10, snapToGrid(originalSize.height + deltaY)) // Verlaagd van 20 naar 10
              break
            case "sw": // Southwest (bottom-left)
              newWidth = Math.max(10, snapToGrid(originalSize.width - deltaX))
              newHeight = Math.max(10, snapToGrid(originalSize.height + deltaY))
              newX = snapToGrid(originalSize.x + deltaX)
              break
            case "ne": // Northeast (top-right)
              newWidth = Math.max(10, snapToGrid(originalSize.width + deltaX))
              newHeight = Math.max(10, snapToGrid(originalSize.height - deltaY))
              newY = snapToGrid(originalSize.y + deltaY)
              break
            case "nw": // Northwest (top-left)
              newWidth = Math.max(10, snapToGrid(originalSize.width - deltaX))
              newHeight = Math.max(10, snapToGrid(originalSize.height - deltaY))
              newX = snapToGrid(originalSize.x + deltaX)
              newY = snapToGrid(originalSize.y + deltaY)
              break
            case "e": // East (right)
              newWidth = Math.max(10, snapToGrid(originalSize.width + deltaX))
              break
            case "w": // West (left)
              newWidth = Math.max(10, snapToGrid(originalSize.width - deltaX))
              newX = snapToGrid(originalSize.x + deltaX)
              break
            case "s": // South (bottom)
              newHeight = Math.max(10, snapToGrid(originalSize.height + deltaY))
              break
            case "n": // North (top)
              newHeight = Math.max(10, snapToGrid(originalSize.height - deltaY))
              newY = snapToGrid(originalSize.y + deltaY)
              break
          }

          // Update the element
          if (dragTarget.type === "boat") {
            const updatedBoats = state.boats.map((boat) =>
              boat.id === dragTarget.id ? { ...boat, x: newX, y: newY, width: newWidth, height: newHeight } : boat,
            )
            updateState({ boats: updatedBoats })
          } else if (dragTarget.type === "pier") {
            const updatedPiers = state.piers.map((pier) =>
              pier.id === dragTarget.id ? { ...pier, x: newX, y: newY, width: newWidth, height: newHeight } : pier,
            )
            updateState({ piers: updatedPiers })
          } else if (dragTarget.type === "slot") {
            const updatedSlots = state.slots.map((slot) =>
              slot.id === dragTarget.id ? { ...slot, x: newX, y: newY, width: newWidth, height: newHeight } : slot,
            )
            updateState({ slots: updatedSlots })
          } else if (dragTarget.type === "zone") {
            const updatedZones = state.zones.map((zone) =>
              zone.id === dragTarget.id ? { ...zone, x: newX, y: newY, width: newWidth, height: newHeight } : zone,
            )
            updateState({ zones: updatedZones })
          }
        }
      }

      if (!isDrawing || !tempElement) return

      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const mouseX = (e.clientX - rect.left - translateX) / scale
      const mouseY = (e.clientY - rect.top - translateY) / scale

      setTempElement({
        ...tempElement,
        width: snapToGrid(mouseX) - tempElement.x,
        height: snapToGrid(mouseY) - tempElement.y,
      })
    }

    const handleGlobalMouseUp = () => {
      if (isPanning) {
        setIsPanning(false)
      }
      if (isDragging) {
        // Check for slot assignment when dropping a boat
        if (dragTarget?.type === "boat" && dragTarget.action === "move") {
          const boat = state.boats.find((b) => b.id === dragTarget.id)
          if (boat) {
            // Find overlapping slot
            const overlappingSlot = state.slots.find((slot) => {
              const boatCenterX = boat.x + boat.width / 2
              const boatCenterY = boat.y + boat.height / 2

              return (
                boatCenterX >= slot.x &&
                boatCenterX <= slot.x + slot.width &&
                boatCenterY >= slot.y &&
                boatCenterY <= slot.y + slot.height &&
                !slot.occupied // Only assign to free slots
              )
            })

            if (overlappingSlot) {
              // Assign boat to slot
              const updatedBoats = state.boats.map((b) => {
                if (b.id === boat.id) {
                  // Adjust boat orientation based on slot orientation
                  const adjustedBoat = { ...b }
                  const boatLengthInMeters = b.size
                  const boatWidthInMeters = (b as any).widthInMeters || 3.5

                  if (overlappingSlot.orientation === "vertical") {
                    // Vertical slot: boat stands upright (width = boat width, height = boat length)
                    adjustedBoat.width = boatWidthInMeters * 10 // SCALE
                    adjustedBoat.height = boatLengthInMeters * 10 // SCALE
                  } else {
                    // Horizontal slot: boat lies flat (width = boat length, height = boat width)
                    adjustedBoat.width = boatLengthInMeters * 10 // SCALE
                    adjustedBoat.height = boatWidthInMeters * 10 // SCALE
                  }

                  // Center boat in slot
                  adjustedBoat.x = overlappingSlot.x + (overlappingSlot.width - adjustedBoat.width) / 2
                  adjustedBoat.y = overlappingSlot.y + (overlappingSlot.height - adjustedBoat.height) / 2
                  adjustedBoat.slotId = overlappingSlot.id

                  return adjustedBoat
                }
                // Remove this boat from any other slots
                return b.slotId === overlappingSlot.id ? { ...b, slotId: null } : b
              })

              // Update slots - mark new slot as occupied, free up old slots
              const updatedSlots = state.slots.map((slot) => {
                if (slot.id === overlappingSlot.id) {
                  return { ...slot, occupied: true, boatId: boat.id }
                }
                // Free up slot if boat was moved away
                if (slot.boatId === boat.id && slot.id !== overlappingSlot.id) {
                  return { ...slot, occupied: false, boatId: null }
                }
                return slot
              })

              updateState({ boats: updatedBoats, slots: updatedSlots })

              console.log(`🚤 Boot "${boat.name}" toegewezen aan ligplaats "${overlappingSlot.name}"`)
            } else {
              // Boat was moved away from any slot - free up previous slot if any
              if (boat.slotId) {
                const updatedBoats = state.boats.map((b) => (b.id === boat.id ? { ...b, slotId: null } : b))
                const updatedSlots = state.slots.map((slot) =>
                  slot.boatId === boat.id ? { ...slot, occupied: false, boatId: null } : slot,
                )
                updateState({ boats: updatedBoats, slots: updatedSlots })

                console.log(`🚤 Boot "${boat.name}" weggehaald van ligplaats`)
              }
            }
          }
        }

        setIsDragging(false)
        setDragTarget(null)
        setDragOffset({ x: 0, y: 0 })
        setOriginalSize({ width: 0, height: 0, x: 0, y: 0 })
      }
      if (isDrawing) {
        setIsDrawing(false)
        setTempElement(null)
      }
    }

    document.addEventListener("mousemove", handleGlobalMouseMove)
    document.addEventListener("mouseup", handleGlobalMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove)
      document.removeEventListener("mouseup", handleGlobalMouseUp)
    }
  }, [
    isPanning,
    startPos,
    isDragging,
    dragTarget,
    dragOffset,
    originalSize,
    isDrawing,
    tempElement,
    scale,
    translateX,
    translateY,
    state.boats,
    state.piers,
    state.slots,
    state.zones,
    updateState,
    user,
    currentUserRole,
    isZooming,
    initialDistance,
    initialScale,
    zoomCenter,
  ])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      // Changed from e.button === 1 (middle) to e.button === 2 (right)
      setIsPanning(true)
      setStartPos({
        x: e.clientX,
        y: e.clientY,
      })
      return
    }

    if (e.button !== 0 || currentUserRole === "viewer") return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = (e.clientX - rect.left - translateX) / scale
    const mouseY = (e.clientY - rect.top - translateY) / scale

    if (drawingMode === "zone" && currentUserRole === "admin") {
      setIsDrawing(true)
      setTempElement({
        type: "zone",
        x: snapToGrid(mouseX),
        y: snapToGrid(mouseY),
        width: 0,
        height: 0,
      })
    } else if (drawingMode === "pier" && currentUserRole === "admin") {
      setIsDrawing(true)
      setTempElement({
        type: "pier",
        x: snapToGrid(mouseX),
        y: snapToGrid(mouseY),
        width: 0,
        height: 0,
      })
    } else if (drawingMode === "slot" && currentUserRole === "admin") {
      setIsDrawing(true)
      setTempElement({
        type: "slot",
        x: snapToGrid(mouseX),
        y: snapToGrid(mouseY),
        width: 0,
        height: 0,
      })
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !tempElement) return

    if (tempElement.type === "zone") {
      const zoneName = prompt("Geef een naam voor deze zone:", `Zone ${state.nextZoneId}`)
      if (zoneName === null) return

      const newZone: Zone = {
        id: state.nextZoneId,
        name: zoneName || `Zone ${state.nextZoneId}`,
        x: tempElement.x,
        y: tempElement.y,
        width: Math.abs(tempElement.width),
        height: Math.abs(tempElement.height),
        color: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.3)`,
        havenmeesters: [],
        description: "",
      }

      updateState({
        zones: [...state.zones, newZone],
        nextZoneId: state.nextZoneId + 1,
        selectedZone: newZone,
        selectedPier: null,
        selectedSlot: null,
        selectedBoat: null,
        selectedZone: null,
      })
    } else if (tempElement.type === "pier") {
      const newPier: Pier = {
        id: state.nextPierId,
        name: `Steiger ${state.nextPierId}`,
        type: Math.abs(tempElement.width) > Math.abs(tempElement.height) ? "horizontal" : "vertical",
        x: tempElement.x,
        y: tempElement.y,
        width: Math.abs(tempElement.width),
        height: Math.abs(tempElement.height),
      }

      updateState({
        piers: [...state.piers, newPier],
        nextPierId: state.nextPierId + 1,
        selectedPier: newPier,
        selectedSlot: null,
        selectedBoat: null,
        selectedZone: null,
      })
    } else if (tempElement.type === "slot") {
      const slotName = prompt("Geef een naam voor deze ligplaats:", `Ligplaats ${state.nextSlotId}`)
      if (slotName === null) return

      const newSlot: Slot = {
        id: state.nextSlotId,
        name: slotName || `Ligplaats ${state.nextSlotId}`,
        x: tempElement.x,
        y: tempElement.y,
        width: Math.abs(tempElement.width),
        height: Math.abs(tempElement.height),
        occupied: false,
        boatId: null,
        orientation: Math.abs(tempElement.width) > Math.abs(tempElement.height) ? "horizontal" : "vertical",
      }

      updateState({
        slots: [...state.slots, newSlot],
        nextSlotId: state.nextSlotId + 1,
        selectedSlot: newSlot,
        selectedPier: null,
        selectedBoat: null,
        selectedZone: null,
      })
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    // Always prevent default scrolling behavior
    e.preventDefault()

    if (e.ctrlKey) return

    const zoomIntensity = 0.05
    const delta = e.deltaY < 0 ? 1 + zoomIntensity : 1 - zoomIntensity
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    // Get mouse position relative to the canvas container
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Convert mouse position to world coordinates (before zoom)
    const worldX = (mouseX - translateX) / scale
    const worldY = (mouseY - translateY) / scale

    // Calculate new scale with limits
    const newScale = Math.max(0.1, Math.min(5, scale * delta))

    // Calculate new translation to keep the world point under the mouse cursor
    const newTranslateX = mouseX - worldX * newScale
    const newTranslateY = mouseY - worldY * newScale

    setScale(newScale)
    setTranslateX(newTranslateX)
    setTranslateY(newTranslateY)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()

    if (e.touches.length === 1) {
      // Single touch for panning and potential selection
      const touch = e.touches[0]
      setTouchStartTime(Date.now())
      setTouchStartPos({ x: touch.clientX, y: touch.clientY })
      setIsPanning(true)
      setStartPos({
        x: touch.clientX,
        y: touch.clientY,
      })
    } else if (e.touches.length === 2) {
      // Two touches for zooming
      setIsPanning(false) // Stop panning if it was active
      setIsZooming(true)

      const touch1 = e.touches[0]
      const touch2 = e.touches[1]

      const distance = getTouchDistance(touch1, touch2)
      const center = getTouchCenter(touch1, touch2)

      setInitialDistance(distance)
      setInitialScale(scale)
      setZoomCenter(center)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()

    if (e.touches.length === 1 && isPanning && !isZooming) {
      // Single touch panning
      const deltaX = e.touches[0].clientX - startPos.x
      const deltaY = e.touches[0].clientY - startPos.y
      setTranslateX(translateX + deltaX)
      setTranslateY(translateY + deltaY)
      setStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    } else if (e.touches.length === 2 && isZooming) {
      // Two touch zooming
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]

      const currentDistance = getTouchDistance(touch1, touch2)
      const currentCenter = getTouchCenter(touch1, touch2)

      // Calculate scale factor
      const scaleFactor = currentDistance / initialDistance
      const newScale = Math.max(0.1, Math.min(5, initialScale * scaleFactor))

      // Get canvas rect for coordinate conversion
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      // Convert zoom center to world coordinates (before zoom)
      const worldX = (zoomCenter.x - rect.left - translateX) / scale
      const worldY = (zoomCenter.y - rect.top - translateY) / scale

      // Calculate new translation to keep the zoom center point stable
      const newTranslateX = zoomCenter.x - rect.left - worldX * newScale
      const newTranslateY = zoomCenter.y - rect.top - worldY * newScale

      setScale(newScale)
      setTranslateX(newTranslateX)
      setTranslateY(newTranslateY)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()

    if (e.touches.length === 0) {
      // All touches ended
      const touchDuration = Date.now() - touchStartTime
      const touchMoved =
        Math.abs(e.changedTouches[0].clientX - touchStartPos.x) > 10 ||
        Math.abs(e.changedTouches[0].clientY - touchStartPos.y) > 10

      console.log(
        `Touch ended - Duration: ${touchDuration}ms, Moved: ${touchMoved}, Panning: ${isPanning}, Zooming: ${isZooming}, Scale: ${scale.toFixed(2)}`,
      )

      // Check if this was a tap (short duration, minimal movement, not during pan/zoom)
      if (touchDuration < 300 && !touchMoved && !isZooming && currentUserRole !== "viewer") {
        // Handle tap selection - only for boats
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) {
          console.log("No canvas rect available")
          return
        }

        // Get the exact touch position from the original touch start
        const touchX = touchStartPos.x
        const touchY = touchStartPos.y

        // Convert screen coordinates to canvas coordinates
        const canvasX = touchX - rect.left
        const canvasY = touchY - rect.top

        // Apply inverse transform to get world coordinates
        // This is the key fix: we need to account for both translation and scale
        const worldX = (canvasX - translateX) / scale
        const worldY = (canvasY - translateY) / scale

        console.log(`🎯 Touch Selection Debug:`)
        console.log(`  Screen touch: (${touchX}, ${touchY})`)
        console.log(`  Canvas rect: left=${rect.left}, top=${rect.top}`)
        console.log(`  Canvas coords: (${canvasX}, ${canvasY})`)
        console.log(`  Transform: translateX=${translateX}, translateY=${translateY}, scale=${scale}`)
        console.log(`  World coords: (${worldX.toFixed(1)}, ${worldY.toFixed(1)})`)

        // Check boats only (highest priority for touch)
        let foundBoat = false
        for (const boat of state.boats) {
          const boatLeft = boat.x
          const boatRight = boat.x + boat.width
          const boatTop = boat.y
          const boatBottom = boat.y + boat.height

          console.log(
            `  Checking boat "${boat.name}": (${boatLeft.toFixed(1)}, ${boatTop.toFixed(1)}) to (${boatRight.toFixed(1)}, ${boatBottom.toFixed(1)})`,
          )

          if (worldX >= boatLeft && worldX <= boatRight && worldY >= boatTop && worldY <= boatBottom) {
            console.log(`  ✅ Hit detected on boat: ${boat.name}`)

            // Check if user can edit this boat
            if (canEditBoat(user?.uid || "", boat, state.zones, currentUserRole)) {
              updateState({
                selectedBoat: boat,
                selectedPier: null,
                selectedSlot: null,
                selectedZone: null,
              })
              console.log(`🚤 Boot "${boat.name}" geselecteerd via touch (zoom: ${scale.toFixed(2)}x)`)
            } else {
              // Show access denied message
              const boatZone = findBoatZone(boat, state.zones)
              console.log(`🔒 Geen toegang tot boot "${boat.name}" in zone "${boatZone?.name}"`)
              alert(
                `🔒 Geen toegang tot deze boot!\n\nBoot "${boat.name}" staat in zone "${boatZone?.name || "Onbekende zone"}" waar je geen toegang toe hebt.`,
              )
            }
            foundBoat = true
            break
          }
        }

        // If no boat was touched, deselect all
        if (!foundBoat) {
          updateState({
            selectedBoat: null,
            selectedPier: null,
            selectedSlot: null,
            selectedZone: null,
          })
          console.log(`📍 Lege ruimte getapt - alles gedeselecteerd (zoom: ${scale.toFixed(2)}x)`)
        }
      }

      setIsPanning(false)
      setIsZooming(false)
      setInitialDistance(0)
      setInitialScale(1)
      setTouchStartTime(0)
      setTouchStartPos({ x: 0, y: 0 })
    } else if (e.touches.length === 1 && isZooming) {
      // Went from 2 touches to 1 touch - switch back to panning
      setIsZooming(false)
      setIsPanning(true)
      setStartPos({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      })
    }
  }

  const startDragging = (
    e: React.MouseEvent,
    type: string,
    id: number,
    elementX: number,
    elementY: number,
    elementWidth: number,
    elementHeight: number,
  ) => {
    if (drawingMode !== "select" || currentUserRole === "viewer") return

    // Extra controle voor boten - controleer zone toegang op basis van HUIDIGE positie
    // MAAR admins hebben altijd toegang
    if (type === "boat" && currentUserRole !== "admin") {
      const boat = state.boats.find((b) => b.id === id)
      if (boat && !canEditBoat(user?.uid || "", boat, state.zones, currentUserRole)) {
        // Toon waarschuwing
        const boatZone = findBoatZone(boat, state.zones)
        alert(
          `🔒 Geen toegang tot deze boot!\n\nBoot "${boat.name}" staat in zone "${boatZone?.name || "Onbekende zone"}" waar je geen toegang toe hebt.`,
        )
        return
      }
    }

    e.stopPropagation()

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = (e.clientX - rect.left - translateX) / scale
    const mouseY = (e.clientY - rect.top - translateY) / scale

    setIsDragging(true)
    setDragTarget({ type, id, action: "move" })
    setDragOffset({
      x: mouseX - elementX,
      y: mouseY - elementY,
    })

    // Select the dragged element
    if (type === "boat") {
      const boat = state.boats.find((b) => b.id === id)
      if (boat) {
        updateState({
          selectedBoat: boat,
          selectedPier: null,
          selectedSlot: null,
          selectedZone: null,
        })
      }
    } else if (type === "pier") {
      const pier = state.piers.find((p) => p.id === id)
      if (pier) {
        updateState({
          selectedPier: pier,
          selectedSlot: null,
          selectedBoat: null,
          selectedZone: null,
        })
      }
    } else if (type === "slot") {
      const slot = state.slots.find((s) => s.id === id)
      if (slot) {
        updateState({
          selectedSlot: slot,
          selectedPier: null,
          selectedBoat: null,
          selectedZone: null,
        })
      }
    } else if (type === "zone") {
      const zone = state.zones.find((z) => z.id === id)
      if (zone) {
        updateState({
          selectedZone: zone,
          selectedPier: null,
          selectedSlot: null,
          selectedBoat: null,
        })
      }
    }
  }

  const startResizing = (
    e: React.MouseEvent,
    type: string,
    id: number,
    handle: string,
    elementX: number,
    elementY: number,
    elementWidth: number,
    elementHeight: number,
  ) => {
    if (drawingMode !== "select" || currentUserRole === "viewer") return

    // Boten kunnen niet geresized worden - alleen numeriek bewerken
    if (type === "boat") return

    // Extra controle voor andere elementen
    if (type !== "boat" && currentUserRole !== "admin") {
      return
    }

    e.stopPropagation()

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = (e.clientX - rect.left - translateX) / scale
    const mouseY = (e.clientY - rect.top - translateY) / scale

    setIsDragging(true)
    setDragTarget({ type, id, action: "resize", handle })
    setDragOffset({ x: mouseX, y: mouseY })
    setOriginalSize({
      x: elementX,
      y: elementY,
      width: elementWidth,
      height: elementHeight,
    })
  }

  const renderResizeHandles = (
    type: string,
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
    isSelected: boolean,
  ) => {
    if (!isSelected || drawingMode !== "select" || currentUserRole === "viewer") return null

    // Geen resize handles voor boten - alleen numeriek bewerken
    if (type === "boat") return null

    // Extra controle voor andere elementen - controleer zone toegang
    // MAAR admins hebben altijd toegang
    if (type !== "boat" && currentUserRole !== "admin") {
      // Voor nu alleen boten hebben zone-gebaseerde toegang
      // Andere elementen zijn alleen voor admins
      return null
    }

    // Voor alle andere elementen (pier, slot, zone): gebruik altijd de werkelijke afmetingen die zijn doorgegeven
    const actualX = x
    const actualY = y
    const actualWidth = width
    const actualHeight = height

    // Gebruik een minimum handle size die schaalt met de zoom
    const minHandleSize = Math.max(8, 12 / scale)
    const handleSize = Math.min(minHandleSize, Math.min(actualWidth, actualHeight) / 4)

    const handles = [
      { handle: "nw", x: actualX - handleSize / 2, y: actualY - handleSize / 2, cursor: "nw-resize" },
      { handle: "n", x: actualX + actualWidth / 2 - handleSize / 2, y: actualY - handleSize / 2, cursor: "n-resize" },
      { handle: "ne", x: actualX + actualWidth - handleSize / 2, y: actualY - handleSize / 2, cursor: "ne-resize" },
      {
        handle: "e",
        x: actualX + actualWidth - handleSize / 2,
        y: actualY + actualHeight / 2 - handleSize / 2,
        cursor: "e-resize",
      },
      {
        handle: "se",
        x: actualX + actualWidth - handleSize / 2,
        y: actualY + actualHeight - handleSize / 2,
        cursor: "se-resize",
      },
      {
        handle: "s",
        x: actualX + actualWidth / 2 - handleSize / 2,
        y: actualY + actualHeight - handleSize / 2,
        cursor: "s-resize",
      },
      { handle: "sw", x: actualX - handleSize / 2, y: actualY + actualHeight - handleSize / 2, cursor: "sw-resize" },
      {
        handle: "w",
        x: actualX - handleSize / 2,
        y: actualY + actualHeight / 2 - handleSize / 2,
        cursor: "w-resize",
      },
    ]

    return handles.map(({ handle, x: hx, y: hy, cursor }) => (
      <div
        key={`${type}-${id}-${handle}`}
        className="absolute bg-blue-600 border-2 border-white rounded-sm z-50 hover:bg-blue-700 shadow-lg"
        style={{
          left: `${hx}px`,
          top: `${hy}px`,
          width: `${handleSize}px`,
          height: `${handleSize}px`,
          cursor,
          minWidth: "8px",
          minHeight: "8px",
        }}
        onMouseDown={(e) => startResizing(e, type, id, handle, actualX, actualY, actualWidth, actualHeight)}
      />
    ))
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        ref={canvasRef}
        className={`absolute top-0 left-0 w-[5000px] h-[5000px] ${
          isPanning ? "cursor-grabbing" : isDragging ? "cursor-grabbing" : "cursor-grab"
        } touch-none`}
        style={{
          backgroundImage: gridVisible
            ? "linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)"
            : "none",
          backgroundSize: "20px 20px",
          transformOrigin: "0 0",
          backgroundColor: "#87CEEB",
          borderRadius: "20px",
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Render zones (onderste laag) - alleen als zonesVisible true is */}
        {zonesVisible &&
          state.zones.map((zone) => {
            const isSelected = state.selectedZone?.id === zone.id
            return (
              <div key={`zone-${zone.id}`}>
                <div
                  className={`absolute border-2 border-dashed cursor-move z-5 ${
                    isSelected ? "ring-4 ring-yellow-400" : ""
                  } ${isDragging && dragTarget?.type === "zone" && dragTarget?.id === zone.id ? "opacity-70" : ""}`}
                  style={{
                    left: `${zone.x}px`,
                    top: `${zone.y}px`,
                    width: `${zone.width}px`,
                    height: `${zone.height}px`,
                    backgroundColor: zone.color,
                    borderColor: zone.color.replace("0.3", "0.8"),
                  }}
                  onMouseDown={(e) =>
                    currentUserRole === "admin" &&
                    startDragging(e, "zone", zone.id, zone.x, zone.y, zone.width, zone.height)
                  }
                >
                  <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded text-xs font-bold text-gray-800 pointer-events-none">
                    🏢 {zone.name}
                  </div>
                  {/* Toon havenmeesters count */}
                  <div className="absolute top-2 right-2 bg-blue-600/90 text-white px-2 py-1 rounded text-xs font-bold pointer-events-none">
                    ⚓ {(zone.havenmeesters || []).length}
                  </div>
                </div>
                {renderResizeHandles("zone", zone.id, zone.x, zone.y, zone.width, zone.height, isSelected)}
              </div>
            )
          })}

        {/* Render piers */}
        {state.piers.map((pier) => {
          const isSelected = state.selectedPier?.id === pier.id
          return (
            <div key={`pier-${pier.id}`}>
              <div
                className={`absolute bg-amber-800 border-2 border-amber-900 cursor-move z-10 ${
                  isSelected ? "ring-4 ring-yellow-400" : ""
                } ${isDragging && dragTarget?.type === "pier" && dragTarget?.id === pier.id ? "opacity-70" : ""}`}
                style={{
                  left: `${pier.x}px`,
                  top: `${pier.y}px`,
                  width: `${pier.width}px`,
                  height: `${pier.height}px`,
                }}
                onMouseDown={(e) =>
                  currentUserRole === "admin" &&
                  startDragging(e, "pier", pier.id, pier.x, pier.y, pier.width, pier.height)
                }
              />
              {renderResizeHandles("pier", pier.id, pier.x, pier.y, pier.width, pier.height, isSelected)}
            </div>
          )
        })}

        {/* Render slots */}
        {state.slots.map((slot) => {
          const isSelected = state.selectedSlot?.id === slot.id
          return (
            <div key={`slot-${slot.id}`}>
              <div
                className={`absolute border border-dashed border-white/70 cursor-move z-20 ${
                  slot.occupied ? "bg-red-200/30" : "bg-green-200/30"
                } ${isSelected ? "ring-4 ring-yellow-400" : ""} ${
                  isDragging && dragTarget?.type === "slot" && dragTarget?.id === slot.id ? "opacity-70" : ""
                }`}
                style={{
                  left: `${slot.x}px`,
                  top: `${slot.y}px`,
                  width: `${slot.width}px`,
                  height: `${slot.height}px`,
                }}
                onMouseDown={(e) =>
                  currentUserRole === "admin" &&
                  startDragging(e, "slot", slot.id, slot.x, slot.y, slot.width, slot.height)
                }
              >
                <div className="absolute -bottom-6 left-0 w-full text-center text-xs text-gray-800 font-bold bg-white/80 rounded pointer-events-none">
                  {slot.name}
                </div>
              </div>
              {renderResizeHandles("slot", slot.id, slot.x, slot.y, slot.width, slot.height, isSelected)}
            </div>
          )
        })}

        {/* Render boats */}
        {state.boats.map((boat) => {
          const isVertical = boat.height > boat.width
          const canEdit = canEditBoat(user?.uid || "", boat, state.zones, currentUserRole)
          const boatZone = findBoatZone(boat, state.zones)
          const isSelected = state.selectedBoat?.id === boat.id

          return (
            <div key={`boat-${boat.id}`}>
              <div
                className={`absolute rounded-lg flex flex-col justify-center items-center text-white text-sm font-bold z-30 border-2 select-none ${
                  canEdit ? "cursor-move border-white" : "cursor-not-allowed border-red-500"
                } ${isSelected ? "ring-4 ring-yellow-400 z-40" : ""} ${
                  isDragging && dragTarget?.type === "boat" && dragTarget?.id === boat.id ? "opacity-70 scale-105" : ""
                } ${!canEdit ? "opacity-60" : ""}`}
                style={{
                  left: `${boat.x}px`,
                  top: `${boat.y}px`,
                  width: `${boat.width}px`,
                  height: `${boat.height}px`,
                  backgroundColor: canEdit ? boat.color : "#666666",
                  // Verwijderd: minWidth en minHeight zodat boot echt smaller kan worden
                }}
                onMouseDown={(e) => startDragging(e, "boat", boat.id, boat.x, boat.y, boat.width, boat.height)}
                title={
                  canEdit
                    ? `${boat.name} - Klik om te selecteren`
                    : `${boat.name} - Geen toegang (${boatZone?.name || "Onbekende zone"})`
                }
              >
                <div
                  className="text-xs font-bold text-center px-1 pointer-events-none whitespace-nowrap"
                  style={{
                    transform: isVertical ? "rotate(-90deg)" : "none",
                    transformOrigin: "center",
                    maxWidth: isVertical ? `${boat.height - 10}px` : `${boat.width - 10}px`,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontSize: Math.max(8, Math.min(12, boat.width / 8)) + "px", // Dynamische font size
                  }}
                >
                  {boat.name}
                </div>
                {!canEdit && (
                  <div className="absolute top-0 right-0 text-xs bg-red-600 text-white px-1 rounded-bl">🔒</div>
                )}
                {/* Toon zone naam alleen als zones zichtbaar zijn EN voor havenmeesters/admins */}
                {boatZone && zonesVisible && currentUserRole !== "viewer" && (
                  <div className="absolute bottom-0 left-0 text-xs bg-black/70 text-white px-1 rounded-tr text-[10px]">
                    {boatZone.name}
                  </div>
                )}
              </div>
              {renderResizeHandles("boat", boat.id, boat.x, boat.y, boat.width, boat.height, isSelected)}
            </div>
          )
        })}

        {/* Render temporary element - alleen als zones zichtbaar zijn */}
        {tempElement && zonesVisible && (
          <div
            className={`absolute opacity-70 pointer-events-none border-4 border-dashed ${
              tempElement.type === "zone"
                ? "bg-purple-200/50 border-purple-500"
                : tempElement.type === "pier"
                  ? "bg-amber-800 border-red-500"
                  : "bg-white/20 border-blue-500"
            }`}
            style={{
              left: `${tempElement.x}px`,
              top: `${tempElement.y}px`,
              width: `${Math.abs(tempElement.width)}px`,
              height: `${Math.abs(tempElement.height)}px`,
            }}
          />
        )}
      </div>
    </div>
  )
}
