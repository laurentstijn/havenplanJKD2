import type { Boat, Slot } from "@/types"
import { SCALE } from "./constants"

// Functie om boot orientatie aan te passen op basis van slot orientatie
export function adjustBoatOrientation(boat: Boat, slot: Slot | null): Boat {
  if (!slot) return boat

  // Haal de werkelijke afmetingen in meters op
  const boatLengthInMeters = boat.size // Lengte is altijd in boat.size
  const boatWidthInMeters = (boat as any).widthInMeters || 3.5 // Standaard 3.5m als niet beschikbaar

  // Bereken visuele afmetingen op basis van slot orientatie
  let visualWidth: number
  let visualHeight: number

  if (slot.orientation === "vertical") {
    // Voor verticale slots: boot staat verticaal (lengte = hoogte, breedte = breedte)
    visualWidth = boatWidthInMeters * SCALE // breedte in pixels
    visualHeight = boatLengthInMeters * SCALE // lengte in pixels
  } else {
    // Voor horizontale slots: boot staat horizontaal (lengte = breedte, breedte = hoogte)
    visualWidth = boatLengthInMeters * SCALE // lengte in pixels
    visualHeight = boatWidthInMeters * SCALE // breedte in pixels
  }

  return {
    ...boat,
    width: visualWidth,
    height: visualHeight,
    x: slot.x + (slot.width - visualWidth) / 2,
    y: slot.y + (slot.height - visualHeight) / 2,
    widthInMeters: boatWidthInMeters,
  } as any
}

// Functie om te controleren of een boot past in een slot
export function doesBoatFitInSlot(boat: Boat, slot: Slot): boolean {
  const boatLengthPixels = boat.size * SCALE
  const boatWidthInMeters = (boat as any).widthInMeters || boat.width / SCALE
  const boatWidthPixels = boatWidthInMeters * SCALE

  // Controleer beide orientaties
  const fitsVertical = boatWidthPixels <= slot.width && boatLengthPixels <= slot.height
  const fitsHorizontal = boatLengthPixels <= slot.width && boatWidthPixels <= slot.height

  return fitsVertical || fitsHorizontal
}

// Functie om boot automatisch te positioneren in een slot
export function positionBoatInSlot(boat: Boat, slot: Slot): Boat {
  const adjustedBoat = adjustBoatOrientation(boat, slot)

  return {
    ...adjustedBoat,
    slotId: slot.id,
    x: slot.x + (slot.width - adjustedBoat.width) / 2,
    y: slot.y + (slot.height - adjustedBoat.height) / 2,
  }
}

// Functie om de huidige visuele orientatie van een boot te bepalen
export function getBoatVisualOrientation(boat: Boat): "vertical" | "horizontal" {
  return boat.height > boat.width ? "vertical" : "horizontal"
}

// Functie om boot terug te zetten naar standaard orientatie (horizontaal)
export function resetBoatToDefaultOrientation(boat: Boat): Boat {
  const boatWidthInMeters = (boat as any).widthInMeters || 3.5 // Standaard 3.5m
  const boatLengthInMeters = boat.size // Lengte in meters

  return {
    ...boat,
    width: boatLengthInMeters * SCALE, // lengte wordt visuele width (horizontaal)
    height: boatWidthInMeters * SCALE, // breedte wordt visuele height (horizontaal)
    widthInMeters: boatWidthInMeters,
  } as any
}

// Functie om breedte in meters te krijgen van een boot
export function getBoatWidthInMeters(boat: Boat): number {
  return (boat as any).widthInMeters || boat.width / SCALE
}

// Nieuwe functie: Normaliseer boot afmetingen op basis van werkelijke meters
export function normalizeBoatDimensions(boat: Boat): Boat {
  const boatLengthInMeters = boat.size // Lengte in meters (altijd beschikbaar)
  const boatWidthInMeters = (boat as any).widthInMeters || 3.5 // Breedte in meters

  // Bepaal huidige orientatie
  const currentOrientation = getBoatVisualOrientation(boat)

  let normalizedWidth: number
  let normalizedHeight: number

  if (currentOrientation === "vertical") {
    // Verticaal: width = breedte, height = lengte
    normalizedWidth = boatWidthInMeters * SCALE
    normalizedHeight = boatLengthInMeters * SCALE
  } else {
    // Horizontaal: width = lengte, height = breedte
    normalizedWidth = boatLengthInMeters * SCALE
    normalizedHeight = boatWidthInMeters * SCALE
  }

  return {
    ...boat,
    width: normalizedWidth,
    height: normalizedHeight,
    widthInMeters: boatWidthInMeters,
  } as any
}
