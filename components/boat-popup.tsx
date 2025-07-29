"use client"

import type React from "react"

import { useState } from "react"
import type { Boat, Slot } from "@/types"
import { boatTypes, sampleOwners, SCALE } from "@/utils/constants"

interface BoatPopupProps {
  isOpen: boolean
  onClose: () => void
  onAddBoat: (boat: Omit<Boat, "id">) => void
  nextBoatId: number
  availableSlots: Slot[] // Nieuwe prop
}

export function BoatPopup({ isOpen, onClose, onAddBoat, nextBoatId, availableSlots }: BoatPopupProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "motorboat",
    size: 10,
    width: 3.5,
    owner: "",
    phone: "",
    email: "",
  })

  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const boatTypeConfig = boatTypes[formData.type as keyof typeof boatTypes]
    const selectedOwner = formData.owner
      ? { name: formData.owner, phone: formData.phone, email: formData.email }
      : sampleOwners[Math.floor(Math.random() * sampleOwners.length)]

    // Bepaal positie op basis van geselecteerde ligplaats
    let boatX = 200 + Math.random() * 400
    let boatY = 200 + Math.random() * 300
    let boatWidth = formData.size * SCALE // Standaard horizontaal
    let boatHeight = formData.width * SCALE

    const selectedSlot = selectedSlotId ? availableSlots.find((s) => s.id === selectedSlotId) : null

    if (selectedSlot) {
      // Pas orientatie aan op basis van ligplaats
      if (selectedSlot.orientation === "vertical") {
        boatWidth = formData.width * SCALE // breedte
        boatHeight = formData.size * SCALE // lengte
      } else {
        boatWidth = formData.size * SCALE // lengte
        boatHeight = formData.width * SCALE // breedte
      }

      // Centreer boot in ligplaats
      boatX = selectedSlot.x + (selectedSlot.width - boatWidth) / 2
      boatY = selectedSlot.y + (selectedSlot.height - boatHeight) / 2
    }

    const newBoat: Omit<Boat, "id"> & { widthInMeters: number } = {
      name: formData.name || `Boot ${nextBoatId}`,
      type: formData.type,
      size: formData.size,
      owner: selectedOwner.name,
      phone: selectedOwner.phone,
      email: selectedOwner.email,
      slotId: selectedSlotId,
      x: boatX,
      y: boatY,
      width: boatWidth,
      height: boatHeight,
      color: boatTypeConfig.color,
      typeName: boatTypeConfig.name,
      widthInMeters: formData.width,
    }

    onAddBoat(newBoat as any)
    handleClose()
  }

  const handleClose = () => {
    setFormData({
      name: "",
      type: "motorboat",
      size: 10,
      width: 3.5,
      owner: "",
      phone: "",
      email: "",
    })
    setSelectedSlotId(null)
    onClose()
  }

  const handleQuickAdd = (type: "motorboat" | "sailboat") => {
    const boatTypeConfig = boatTypes[type]
    const randomOwner = sampleOwners[Math.floor(Math.random() * sampleOwners.length)]
    const boatLength = type === "sailboat" ? 12 : 10
    const boatWidth = type === "sailboat" ? 4.2 : 3.5

    // Bepaal positie op basis van gebruikersrol (als deze info beschikbaar is)
    const boatX = 200 + Math.random() * 400
    const boatY = 200 + Math.random() * 300

    const newBoat: Omit<Boat, "id"> & { widthInMeters: number } = {
      name: `${boatTypeConfig.name} ${nextBoatId}`,
      type: type,
      size: boatLength, // Lengte in meters
      owner: randomOwner.name,
      phone: randomOwner.phone,
      email: randomOwner.email,
      slotId: null,
      x: boatX,
      y: boatY,
      // Standaard horizontale orientatie: lengte = width, breedte = height
      width: boatLength * SCALE, // Lengte in pixels (horizontaal)
      height: boatWidth * SCALE, // Breedte in pixels (horizontaal)
      color: boatTypeConfig.color,
      typeName: boatTypeConfig.name,
      widthInMeters: boatWidth, // Bewaar originele breedte in meters
    }

    onAddBoat(newBoat as any)
    handleClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-blue-600">Nieuwe Boot Toevoegen</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            aria-label="Sluiten"
          >
            ×
          </button>
        </div>

        {/* Quick Add Buttons */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-bold mb-3 text-gray-700">Snelle Toevoeging:</h3>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 py-2 px-4 bg-orange-600 text-white border-none rounded cursor-pointer text-sm hover:bg-orange-700 transition-colors"
              onClick={() => handleQuickAdd("motorboat")}
            >
              🚤 Motorboot
            </button>
            <button
              type="button"
              className="flex-1 py-2 px-4 bg-blue-600 text-white border-none rounded cursor-pointer text-sm hover:bg-blue-700 transition-colors"
              onClick={() => handleQuickAdd("sailboat")}
            >
              ⛵ Zeilboot
            </button>
          </div>
        </div>

        <div className="text-center text-gray-500 mb-4">of vul handmatig in:</div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Boot Naam:</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Bijv. De Zeevaarder"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Type Boot:</label>
            <select
              className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="motorboat">🚤 Motorboot</option>
              <option value="sailboat">⛵ Zeilboot</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Ligplaats (optioneel):</label>
            <select
              className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedSlotId || ""}
              onChange={(e) => setSelectedSlotId(e.target.value ? Number.parseInt(e.target.value) : null)}
            >
              <option value="">Geen ligplaats (vrij plaatsen)</option>
              {availableSlots
                .filter((slot) => !slot.occupied)
                .map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.name} ({slot.orientation === "horizontal" ? "Horizontaal" : "Verticaal"}) - {slot.width}x
                    {slot.height}px
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Lengte (m):</label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="5"
                max="30"
                step="0.1"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: Number.parseFloat(e.target.value) || 10 })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Breedte (m):</label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="10"
                step="0.1"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: Number.parseFloat(e.target.value) || 3.5 })}
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-xs text-blue-700">
              <strong>💡 Voorbeeld afmetingen:</strong>
              <br />• Motorboot: 10m x 3.5m
              <br />• Zeilboot: 12m x 4.2m
              <br />
              Boot wordt standaard horizontaal geplaatst (lengte = breedte op scherm)
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Eigenaar Gegevens (optioneel):</h3>
            <div className="space-y-3">
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Naam eigenaar"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              />
              <input
                type="tel"
                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Telefoonnummer"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <input
                type="email"
                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email adres"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2 px-4 bg-gray-500 text-white border-none rounded cursor-pointer text-sm hover:bg-gray-600 transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-blue-600 text-white border-none rounded cursor-pointer text-sm hover:bg-blue-700 transition-colors"
            >
              Boot Toevoegen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
