import type { Zone, Boat, Pier, Slot } from "@/types"

// Controleer of een punt binnen een zone valt
export function isPointInZone(x: number, y: number, zone: Zone): boolean {
  return x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height
}

// Controleer of een boot binnen een zone valt
export function isBoatInZone(boat: Boat, zone: Zone): boolean {
  const boatCenterX = boat.x + boat.width / 2
  const boatCenterY = boat.y + boat.height / 2
  return isPointInZone(boatCenterX, boatCenterY, zone)
}

// Controleer of een steiger binnen een zone valt
export function isPierInZone(pier: Pier, zone: Zone): boolean {
  const pierCenterX = pier.x + pier.width / 2
  const pierCenterY = pier.y + pier.height / 2
  return isPointInZone(pierCenterX, pierCenterY, zone)
}

// Controleer of een ligplaats binnen een zone valt
export function isSlotInZone(slot: Slot, zone: Zone): boolean {
  const slotCenterX = slot.x + slot.width / 2
  const slotCenterY = slot.y + slot.height / 2
  return isPointInZone(slotCenterX, slotCenterY, zone)
}

// Vind de zone waarin een boot zich bevindt (op basis van positie)
export function findBoatZone(boat: Boat, zones: Zone[]): Zone | null {
  return zones.find((zone) => isBoatInZone(boat, zone)) || null
}

// Update boot met juiste zone ID op basis van positie
export function updateBoatZoneId(boat: Boat, zones: Zone[]): Boat {
  const zone = findBoatZone(boat, zones)
  const updatedBoat = { ...boat }

  if (zone) {
    updatedBoat.zoneId = zone.id
  } else {
    // Remove zoneId property entirely if no zone found (Firebase doesn't like undefined)
    delete updatedBoat.zoneId
  }

  return updatedBoat
}

// Controleer of een havenmeester toegang heeft tot een zone
export function hasZoneAccess(userUid: string, zone: Zone): boolean {
  return (zone.havenmeesters || []).includes(userUid)
}

// Controleer of een havenmeester een boot mag bewerken
export function canEditBoat(userUid: string, boat: Boat, zones: Zone[], userRole: string): boolean {
  // Admins kunnen alles bewerken
  if (userRole === "admin") return true

  // Viewers kunnen niets bewerken
  if (userRole !== "havenmeester") return false

  // Vind de zone waarin de boot zich bevindt (op basis van positie, niet zoneId)
  const boatZone = findBoatZone(boat, zones)

  // Als boot niet in een zone staat, kunnen alle havenmeesters het bewerken
  if (!boatZone) return true

  // Controleer of havenmeester toegang heeft tot deze zone
  return hasZoneAccess(userUid, boatZone)
}

// Krijg alle boten die een havenmeester mag bewerken
export function getEditableBoatsForUser(userUid: string, boats: Boat[], zones: Zone[], userRole: string): Boat[] {
  if (userRole === "admin") return boats
  if (userRole !== "havenmeester") return []

  return boats.filter((boat) => canEditBoat(userUid, boat, zones, userRole))
}

// Krijg alle zones waar een havenmeester toegang toe heeft
export function getUserZones(userUid: string, zones: Zone[]): Zone[] {
  return zones.filter((zone) => hasZoneAccess(userUid, zone))
}

// Genereer zone kleuren
export const zoneColors = [
  "rgba(255, 0, 0, 0.2)", // Rood
  "rgba(0, 255, 0, 0.2)", // Groen
  "rgba(0, 0, 255, 0.2)", // Blauw
  "rgba(255, 255, 0, 0.2)", // Geel
  "rgba(255, 0, 255, 0.2)", // Magenta
  "rgba(0, 255, 255, 0.2)", // Cyaan
  "rgba(255, 165, 0, 0.2)", // Oranje
  "rgba(128, 0, 128, 0.2)", // Paars
]
