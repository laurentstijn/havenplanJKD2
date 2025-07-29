export type DrawingMode = "select" | "pier" | "slot" | "boat" | "zone"
export type UserRole = "viewer" | "havenmeester" | "admin"

export interface Zone {
  id: number
  name: string
  x: number
  y: number
  width: number
  height: number
  color: string
  havenmeesters: string[] // Array van user UIDs die toegang hebben tot deze zone
  description?: string
}

export interface Pier {
  id: number
  name: string
  type: "horizontal" | "vertical"
  x: number
  y: number
  width: number
  height: number
  zoneId?: number // Optioneel: aan welke zone behoort deze steiger
}

export interface Slot {
  id: number
  name: string
  x: number
  y: number
  width: number
  height: number
  occupied: boolean
  boatId: number | null
  orientation: "horizontal" | "vertical"
  zoneId?: number // Optioneel: aan welke zone behoort deze ligplaats
}

export interface Boat {
  id: number
  name: string
  type: string
  size: number // Lengte in meters (blijft altijd hetzelfde)
  owner: string
  phone: string
  email: string
  slotId: number | null
  x: number
  y: number
  width: number // Visuele breedte in pixels (kan wisselen voor orientatie)
  height: number // Visuele hoogte in pixels (kan wisselen voor orientatie)
  color: string
  typeName: string
  zoneId?: number // Optioneel: in welke zone staat deze boot
  widthInMeters?: number // Breedte in meters (blijft altijd hetzelfde)
}

export interface AppState {
  piers: Pier[]
  slots: Slot[]
  boats: Boat[]
  zones: Zone[]
  nextPierId: number
  nextSlotId: number
  nextBoatId: number
  nextZoneId: number
  selectedPier: Pier | null
  selectedSlot: Slot | null
  selectedBoat: Boat | null
  selectedZone: Zone | null
}
