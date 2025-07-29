"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Plus, Users } from "lucide-react"
import type { AppState, Boat, Pier, Slot, Zone, UserRole } from "@/types"
import { useAuth } from "@/hooks/use-auth"
import { useFirebase } from "@/hooks/use-firebase"
import { findBoatZone } from "@/utils/zone-helpers"
import { BoatPopup } from "./boat-popup"

interface ManagementPanelProps {
  state: AppState
  updateState: (updates: Partial<AppState>) => void
  drawingMode?: any
  currentUserRole: UserRole
  // Camera controls
  scale: number
  setScale: (scale: number) => void
  translateX: number
  setTranslateX: (x: number) => void
  translateY: number
  setTranslateY: (y: number) => void
}

export function ManagementPanel({
  state,
  updateState,
  currentUserRole,
  scale,
  setScale,
  translateX,
  setTranslateX,
  translateY,
  setTranslateY,
}: ManagementPanelProps) {
  const { user } = useAuth()
  const { saveData } = useFirebase()
  const [editingBoat, setEditingBoat] = useState<Boat | null>(null)
  const [editingPier, setEditingPier] = useState<Pier | null>(null)
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [newBoatName, setNewBoatName] = useState("")
  const [newBoatColor, setNewBoatColor] = useState("#3B82F6")
  const [searchTerm, setSearchTerm] = useState("")
  const [showBoatPopup, setShowBoatPopup] = useState(false)

  // Add this useEffect after the existing state declarations (around line 45)
  useEffect(() => {
    // Scroll selected boat into view
    if (state.selectedBoat) {
      const boatElement = document.getElementById(`boat-item-${state.selectedBoat.id}`)
      if (boatElement) {
        boatElement.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
    }

    // Scroll selected pier into view
    if (state.selectedPier) {
      const pierElement = document.getElementById(`pier-item-${state.selectedPier.id}`)
      if (pierElement) {
        pierElement.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
    }

    // Scroll selected slot into view
    if (state.selectedSlot) {
      const slotElement = document.getElementById(`slot-item-${state.selectedSlot.id}`)
      if (slotElement) {
        slotElement.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
    }

    // Scroll selected zone into view
    if (state.selectedZone) {
      const zoneElement = document.getElementById(`zone-item-${state.selectedZone.id}`)
      if (zoneElement) {
        zoneElement.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
    }
  }, [state.selectedBoat, state.selectedPier, state.selectedSlot, state.selectedZone])

  // Get boats that the current user can see/edit
  const getVisibleBoats = () => {
    if (currentUserRole === "admin") {
      return state.boats
    } else if (currentUserRole === "havenmeester") {
      // Harbor masters can only see boats in their assigned zones
      const userZones = state.zones.filter((zone) => zone.havenmeesters && zone.havenmeesters.includes(user?.uid || ""))
      return state.boats.filter((boat) => {
        const boatZone = findBoatZone(boat, state.zones)
        return boatZone && userZones.some((zone) => zone.id === boatZone.id)
      })
    }
    return [] // Viewers can't see boats in management panel
  }

  // Get statistics for harbor masters
  const getBoatStats = () => {
    if (currentUserRole !== "harbormaster" || !user?.uid) return null

    const userZones = state.zones.filter((zone) => zone.havenmeesters && zone.havenmeesters.includes(user.uid))

    if (userZones.length === 0) return null

    const boatsInZones = state.boats.filter((boat) => {
      const boatZone = findBoatZone(boat, state.zones)
      return boatZone && userZones.some((zone) => zone.id === boatZone.id)
    })

    const zoneStats = userZones.map((zone) => {
      // Find all slots in this zone
      const slotsInZone = state.slots.filter((slot) => {
        return slot.x >= zone.x && slot.x < zone.x + zone.width && slot.y >= zone.y && slot.y < zone.y + zone.height
      })

      const totalBerths = slotsInZone.length
      const occupiedBerths = slotsInZone.filter((slot) => slot.occupied).length
      const freeBerths = totalBerths - occupiedBerths

      return {
        zoneName: zone.name,
        totalBerths,
        freeBerths,
        occupiedBerths,
      }
    })

    return {
      totalBoats: boatsInZones.length,
      zones: zoneStats,
      zoneNames: userZones.map((z) => z.name),
    }
  }

  const visibleBoats = getVisibleBoats()
  const boatStats = getBoatStats()

  const handleAddBoat = (boatData: Omit<Boat, "id">) => {
    const newBoat: Boat = {
      ...boatData,
      id: state.nextBoatId,
    }

    // Update slots als boot een ligplaats heeft
    let updatedSlots = state.slots
    if (newBoat.slotId) {
      updatedSlots = state.slots.map((slot) =>
        slot.id === newBoat.slotId ? { ...slot, occupied: true, boatId: newBoat.id } : slot,
      )
    }

    updateState({
      boats: [...state.boats, newBoat],
      slots: updatedSlots,
      nextBoatId: state.nextBoatId + 1,
      selectedBoat: newBoat,
    })

    setNewBoatName("")

    // Center camera on the new boat
    centerOnBoat(newBoat)
  }

  const handleDeleteBoat = (boatId: number) => {
    if (!confirm("Weet je zeker dat je deze boot wilt verwijderen?")) return

    const updatedBoats = state.boats.filter((boat) => boat.id !== boatId)
    const updatedSlots = state.slots.map((slot) =>
      slot.boatId === boatId ? { ...slot, occupied: false, boatId: null } : slot,
    )

    const newState = {
      ...state,
      boats: updatedBoats,
      slots: updatedSlots,
      selectedBoat: state.selectedBoat?.id === boatId ? null : state.selectedBoat,
    }

    updateState(newState)
  }

  const handleEditBoat = (boat: Boat) => {
    setEditingBoat({ ...boat })
  }

  const handleSaveBoat = () => {
    if (!editingBoat) return

    const originalBoat = state.boats.find((b) => b.id === editingBoat.id)
    const oldSlotId = originalBoat?.slotId

    // Bepaal nieuwe positie en orientatie op basis van ligplaats
    const updatedBoat = { ...editingBoat }

    if (editingBoat.slotId) {
      const selectedSlot = state.slots.find((s) => s.id === editingBoat.slotId)
      if (selectedSlot) {
        const boatLengthInMeters = editingBoat.size
        const boatWidthInMeters = (editingBoat as any).widthInMeters || 3.5

        if (selectedSlot.orientation === "vertical") {
          updatedBoat.width = boatWidthInMeters * 10 // SCALE
          updatedBoat.height = boatLengthInMeters * 10 // SCALE
        } else {
          updatedBoat.width = boatLengthInMeters * 10 // SCALE
          updatedBoat.height = boatWidthInMeters * 10 // SCALE
        }

        // Centreer boot in ligplaats
        updatedBoat.x = selectedSlot.x + (selectedSlot.width - updatedBoat.width) / 2
        updatedBoat.y = selectedSlot.y + (selectedSlot.height - updatedBoat.height) / 2
      }
    }

    const updatedBoats = state.boats.map((boat) => (boat.id === editingBoat.id ? updatedBoat : boat))

    // Update ligplaats status
    const updatedSlots = state.slots.map((slot) => {
      // Maak oude ligplaats vrij
      if (slot.id === oldSlotId && oldSlotId !== editingBoat.slotId) {
        return { ...slot, occupied: false, boatId: null }
      }
      // Markeer nieuwe ligplaats als bezet
      if (slot.id === editingBoat.slotId) {
        return { ...slot, occupied: true, boatId: editingBoat.id }
      }
      return slot
    })

    const newState = {
      ...state,
      boats: updatedBoats,
      slots: updatedSlots,
      selectedBoat: state.selectedBoat?.id === editingBoat.id ? updatedBoat : state.selectedBoat,
    }

    updateState(newState)
    setEditingBoat(null)
  }

  const handleDeletePier = (pierId: number) => {
    if (!confirm("Weet je zeker dat je deze steiger wilt verwijderen?")) return

    const updatedPiers = state.piers.filter((pier) => pier.id !== pierId)
    const newState = {
      ...state,
      piers: updatedPiers,
      selectedPier: state.selectedPier?.id === pierId ? null : state.selectedPier,
    }

    updateState(newState)
  }

  const handleEditPier = (pier: Pier) => {
    setEditingPier({ ...pier })
  }

  const handleSavePier = () => {
    if (!editingPier) return

    const updatedPiers = state.piers.map((pier) => (pier.id === editingPier.id ? editingPier : pier))

    const newState = {
      ...state,
      piers: updatedPiers,
      selectedPier: state.selectedPier?.id === editingPier.id ? editingPier : state.selectedPier,
    }

    updateState(newState)
    setEditingPier(null)
  }

  const handleDeleteSlot = (slotId: number) => {
    if (!confirm("Weet je zeker dat je deze ligplaats wilt verwijderen?")) return

    const updatedSlots = state.slots.filter((slot) => slot.id !== slotId)
    const newState = {
      ...state,
      slots: updatedSlots,
      selectedSlot: state.selectedSlot?.id === slotId ? null : state.selectedSlot,
    }

    updateState(newState)
  }

  const handleEditSlot = (slot: Slot) => {
    setEditingSlot({ ...slot })
  }

  const handleSaveSlot = () => {
    if (!editingSlot) return

    const updatedSlots = state.slots.map((slot) => (slot.id === editingSlot.id ? editingSlot : slot))

    const newState = {
      ...state,
      slots: updatedSlots,
      selectedSlot: state.selectedSlot?.id === editingSlot.id ? editingSlot : state.selectedSlot,
    }

    updateState(newState)
    setEditingSlot(null)
  }

  const handleDeleteZone = (zoneId: number) => {
    if (!confirm("Weet je zeker dat je deze zone wilt verwijderen?")) return

    const updatedZones = state.zones.filter((zone) => zone.id !== zoneId)
    const newState = {
      ...state,
      zones: updatedZones,
      selectedZone: state.selectedZone?.id === zoneId ? null : state.selectedZone,
    }

    updateState(newState)
  }

  const handleEditZone = (zone: Zone) => {
    setEditingZone({ ...zone })
  }

  const handleSaveZone = () => {
    if (!editingZone) return

    const updatedZones = state.zones.map((zone) => (zone.id === editingZone.id ? editingZone : zone))

    const newState = {
      ...state,
      zones: updatedZones,
      selectedZone: state.selectedZone?.id === editingZone.id ? editingZone : state.selectedZone,
    }

    updateState(newState)
    setEditingZone(null)
  }

  const filteredBoats = visibleBoats.filter(
    (boat) =>
      boat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boat.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (boat.type || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const centerOnBoat = (boat: Boat) => {
    const viewportWidth = 800 // Estimated canvas width
    const viewportHeight = 600 // Estimated canvas height

    // Calculate center point of the boat
    const boatCenterX = boat.x + boat.width / 2
    const boatCenterY = boat.y + boat.height / 2

    // Set a comfortable zoom level
    const targetScale = Math.max(1, Math.min(2, scale))

    // Calculate translate to center the boat
    const newTranslateX = viewportWidth / 2 - boatCenterX * targetScale
    const newTranslateY = viewportHeight / 2 - boatCenterY * targetScale

    // Apply the new camera position
    setScale(targetScale)
    setTranslateX(newTranslateX)
    setTranslateY(newTranslateY)
  }

  const handleSelectBoat = (boat: Boat) => {
    updateState({
      selectedBoat: boat,
      selectedPier: null,
      selectedSlot: null,
      selectedZone: null,
    })

    // Center camera on selected boat
    centerOnBoat(boat)
  }

  return (
    <div className="flex-1 bg-white border-l border-gray-200 flex flex-col h-[90vh]">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Beheer Paneel</h2>
        <p className="text-sm text-gray-600">
          {currentUserRole === "admin" && "Administrator"}
          {currentUserRole === "harbormaster" && "Havenmeester"}
          {currentUserRole === "viewer" && "Bekijker"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Statistics for Harbor Masters */}
        {boatStats && (
          <div className="p-2">
            <Card className="mb-2">
              <CardContent className="p-2">
                <div className="text-center mb-1">
                  <div className="text-blue-600 font-bold text-xs mb-1">📊 Jouw Zone Overzicht:</div>
                  <div className="text-xl font-bold text-gray-900">{boatStats.totalBoats}</div>
                  <div className="text-xs text-gray-600">Boten in jouw zones</div>
                </div>

                <div className="space-y-1">
                  <div className="text-blue-600 font-bold text-xs">⚓ Ligplaatsen per zone:</div>
                  {boatStats.zones.map((zone, index) => (
                    <div key={index} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-700">{zone.zoneName}</span>
                        <span className="text-gray-500">{zone.totalBerths} ligplaatsen</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-green-600 font-medium">Vrij: {zone.freeBerths}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-red-600 font-medium">Bezet: {zone.occupiedBerths}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 pt-1 border-t border-gray-200">
                  <div className="text-xs text-gray-600">Zones: {boatStats.zoneNames.join(", ")}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Boats Section */}
        <div className="p-2 flex flex-col flex-1">
          <Card className="flex flex-col flex-1">
            <CardHeader className="pb-2 sticky top-0 bg-white z-10 border-b border-gray-100">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center">🚤 Boten ({visibleBoats.length})</span>
                {currentUserRole === "admin" && (
                  <Button size="sm" onClick={() => setShowBoatPopup(true)} className="h-6 px-2 text-xs">
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </CardTitle>
              {/* Search functionality */}
              <div className="mb-2">
                <Input
                  placeholder="🔍 Zoek boten..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="p-2 flex flex-col flex-1 overflow-hidden">
              <div className="space-y-1 flex-1 overflow-y-auto">
                {filteredBoats.map((boat) => {
                  const boatZone = findBoatZone(boat, state.zones)
                  const isSelected = state.selectedBoat?.id === boat.id
                  return (
                    <div
                      key={boat.id}
                      id={`boat-item-${boat.id}`}
                      className={`p-2 border rounded text-xs cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-md"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => handleSelectBoat(boat)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: boat.color }} />
                          <div>
                            <span className="font-medium">{boat.name}</span>
                            <div className="text-xs text-gray-500">
                              {boat.typeName} - {boat.size}m
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditBoat(boat)
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          {currentUserRole === "admin" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteBoat(boat.id)
                              }}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {boatZone && <div className="mt-1 text-xs text-gray-500">Zone: {boatZone.name}</div>}
                      {boat.owner && <div className="mt-1 text-xs text-gray-600">Eigenaar: {boat.owner}</div>}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin-only sections */}
        {currentUserRole === "admin" && (
          <>
            {/* Piers Section */}
            <div className="p-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">🏗️ Steigers ({state.piers.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {state.piers.map((pier) => {
                      const isSelected = state.selectedPier?.id === pier.id
                      return (
                        <div
                          key={pier.id}
                          id={`pier-item-${pier.id}`}
                          className={`p-2 border rounded text-xs cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-md"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            updateState({
                              selectedPier: pier,
                              selectedBoat: null,
                              selectedSlot: null,
                              selectedZone: null,
                            })
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{pier.name}</span>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditPier(pier)
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeletePier(pier.id)
                                }}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {pier.width}×{pier.height} ({pier.type})
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Slots Section */}
            <div className="p-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">⚓ Ligplaatsen ({state.slots.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {state.slots.map((slot) => {
                      const isSelected = state.selectedSlot?.id === slot.id
                      return (
                        <div
                          key={slot.id}
                          id={`slot-item-${slot.id}`}
                          className={`p-2 border rounded text-xs cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-md"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            updateState({
                              selectedSlot: slot,
                              selectedBoat: null,
                              selectedPier: null,
                              selectedZone: null,
                            })
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{slot.name}</span>
                              <Badge variant={slot.occupied ? "destructive" : "secondary"} className="text-xs">
                                {slot.occupied ? "Bezet" : "Vrij"}
                              </Badge>
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditSlot(slot)
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteSlot(slot.id)
                                }}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {slot.width}×{slot.height} ({slot.orientation})
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Zones Section */}
            <div className="p-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">🏢 Zones ({state.zones.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {state.zones.map((zone) => {
                      const isSelected = state.selectedZone?.id === zone.id
                      return (
                        <div
                          key={zone.id}
                          id={`zone-item-${zone.id}`}
                          className={`p-2 border rounded text-xs cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-md"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            updateState({
                              selectedZone: zone,
                              selectedBoat: null,
                              selectedPier: null,
                              selectedSlot: null,
                            })
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: zone.color }} />
                              <span className="font-medium">{zone.name}</span>
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditZone(zone)
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteZone(zone.id)
                                }}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {zone.width}×{zone.height}
                          </div>
                          {zone.havenmeesters && zone.havenmeesters.length > 0 && (
                            <div className="text-xs text-blue-600 mt-1">
                              <Users className="h-3 w-3 inline mr-1" />
                              {zone.havenmeesters.length} havenmeester(s)
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Edit Modals */}
      {editingBoat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Boot Bewerken</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="boat-name">Naam</Label>
                <Input
                  id="boat-name"
                  value={editingBoat.name}
                  onChange={(e) => setEditingBoat({ ...editingBoat, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="boat-color">Kleur</Label>
                <input
                  id="boat-color"
                  type="color"
                  value={editingBoat.color}
                  onChange={(e) => setEditingBoat({ ...editingBoat, color: e.target.value })}
                  className="w-full h-10 rounded border"
                />
              </div>
              <div>
                <Label htmlFor="boat-type">Type</Label>
                <select
                  id="boat-type"
                  value={editingBoat.type}
                  onChange={(e) => setEditingBoat({ ...editingBoat, type: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="sailboat">⛵ Zeilboot</option>
                  <option value="motorboat">🚤 Motorboot</option>
                </select>
              </div>
              <div>
                <Label htmlFor="boat-size">Lengte (meters)</Label>
                <Input
                  id="boat-size"
                  type="number"
                  min="5"
                  max="30"
                  step="0.1"
                  value={(editingBoat as any).size}
                  onChange={(e) =>
                    setEditingBoat({ ...editingBoat, size: Number.parseFloat(e.target.value) || 10 } as any)
                  }
                />
              </div>
              <div>
                <Label htmlFor="boat-width">Breedte (meters)</Label>
                <Input
                  id="boat-width"
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  value={(editingBoat as any).widthInMeters || 3.5}
                  onChange={(e) =>
                    setEditingBoat({ ...editingBoat, widthInMeters: Number.parseFloat(e.target.value) || 3.5 } as any)
                  }
                />
              </div>
              <div>
                <Label htmlFor="boat-owner">Eigenaar</Label>
                <Input
                  id="boat-owner"
                  value={editingBoat.owner}
                  onChange={(e) => setEditingBoat({ ...editingBoat, owner: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="boat-phone">Telefoon</Label>
                <Input
                  id="boat-phone"
                  value={editingBoat.phone}
                  onChange={(e) => setEditingBoat({ ...editingBoat, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="boat-email">Email</Label>
                <Input
                  id="boat-email"
                  type="email"
                  value={editingBoat.email}
                  onChange={(e) => setEditingBoat({ ...editingBoat, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="boat-slot">Ligplaats</Label>
                <select
                  id="boat-slot"
                  value={editingBoat.slotId || ""}
                  onChange={(e) => {
                    const slotId = e.target.value ? Number.parseInt(e.target.value) : null
                    setEditingBoat({ ...editingBoat, slotId })
                  }}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="">Geen ligplaats (vrij plaatsen)</option>
                  {state.slots
                    .filter((slot) => !slot.occupied || slot.id === editingBoat.slotId)
                    .map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.name} ({slot.orientation === "horizontal" ? "Horizontaal" : "Verticaal"})
                        {slot.occupied && slot.id !== editingBoat.slotId ? " - BEZET" : ""}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label htmlFor="boat-notes">Notities</Label>
                <Textarea
                  id="boat-notes"
                  value={editingBoat.notes}
                  onChange={(e) => setEditingBoat({ ...editingBoat, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setEditingBoat(null)}>
                Annuleren
              </Button>
              <Button onClick={handleSaveBoat}>Opslaan</Button>
            </div>
          </div>
        </div>
      )}

      {editingPier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Steiger Bewerken</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="pier-name">Naam</Label>
                <Input
                  id="pier-name"
                  value={editingPier.name}
                  onChange={(e) => setEditingPier({ ...editingPier, name: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setEditingPier(null)}>
                Annuleren
              </Button>
              <Button onClick={handleSavePier}>Opslaan</Button>
            </div>
          </div>
        </div>
      )}

      {editingSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Ligplaats Bewerken</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="slot-name">Naam</Label>
                <Input
                  id="slot-name"
                  value={editingSlot.name}
                  onChange={(e) => setEditingSlot({ ...editingSlot, name: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setEditingSlot(null)}>
                Annuleren
              </Button>
              <Button onClick={handleSaveSlot}>Opslaan</Button>
            </div>
          </div>
        </div>
      )}

      {editingZone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Zone Bewerken</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="zone-name">Naam</Label>
                <Input
                  id="zone-name"
                  value={editingZone.name}
                  onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="zone-description">Beschrijving</Label>
                <Textarea
                  id="zone-description"
                  value={editingZone.description}
                  onChange={(e) => setEditingZone({ ...editingZone, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="zone-color">Kleur</Label>
                <input
                  id="zone-color"
                  type="color"
                  value={editingZone.color.replace(/rgba?$$(\d+),\s*(\d+),\s*(\d+).*?$$/, (match, r, g, b) => {
                    return `#${Number.parseInt(r).toString(16).padStart(2, "0")}${Number.parseInt(g).toString(16).padStart(2, "0")}${Number.parseInt(b).toString(16).padStart(2, "0")}`
                  })}
                  onChange={(e) => {
                    const hex = e.target.value
                    const r = Number.parseInt(hex.slice(1, 3), 16)
                    const g = Number.parseInt(hex.slice(3, 5), 16)
                    const b = Number.parseInt(hex.slice(5, 7), 16)
                    setEditingZone({ ...editingZone, color: `rgba(${r}, ${g}, ${b}, 0.3)` })
                  }}
                  className="w-full h-10 rounded border"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setEditingZone(null)}>
                Annuleren
              </Button>
              <Button onClick={handleSaveZone}>Opslaan</Button>
            </div>
          </div>
        </div>
      )}
      <BoatPopup
        isOpen={showBoatPopup}
        onClose={() => setShowBoatPopup(false)}
        onAddBoat={handleAddBoat}
        nextBoatId={state.nextBoatId}
        availableSlots={state.slots}
      />
    </div>
  )
}
