"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"

interface LoginPopupProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginPopup({ isOpen, onClose }: LoginPopupProps) {
  const { login, register } = useAuth()
  const [isRegistering, setIsRegistering] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      let result
      if (isRegistering) {
        // Nieuwe gebruikers krijgen altijd de rol "viewer"
        result = await register(formData.email, formData.password, formData.displayName, "viewer")
      } else {
        result = await login(formData.email, formData.password)
      }

      if (result.success) {
        handleClose()
      } else {
        setError(result.error || "Er is een fout opgetreden")
      }
    } catch (error) {
      setError("Er is een onverwachte fout opgetreden")
    }

    setIsLoading(false)
  }

  const handleClose = () => {
    setFormData({ email: "", password: "", displayName: "" })
    setError("")
    setIsLoading(false)
    setIsRegistering(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-600">{isRegistering ? "📝 Registreren" : "🔐 Inloggen"}</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            aria-label="Sluiten"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email:</label>
            <input
              type="email"
              className="w-full p-3 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="voorbeeld@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Wachtwoord:</label>
            <input
              type="password"
              className="w-full p-3 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Minimaal 6 karakters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={isLoading}
              required
              minLength={6}
            />
          </div>

          {isRegistering && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Volledige Naam:</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jan van Dijk"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-600">👁️</span>
                  <span className="text-sm font-bold text-blue-800">Standaard Rol: Viewer</span>
                </div>
                <p className="text-xs text-blue-700">
                  Nieuwe accounts krijgen automatisch de rol "Viewer" (alleen lezen). Een administrator kan je rol later
                  upgraden naar Havenmeester of Admin.
                </p>
              </div>
            </>
          )}

          {error && <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">⚠️ {error}</div>}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 px-4 bg-gray-500 text-white border-none rounded cursor-pointer text-sm hover:bg-gray-600 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-blue-600 text-white border-none rounded cursor-pointer text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isRegistering ? "Registreren..." : "Inloggen..."}
                </>
              ) : (
                <>{isRegistering ? "📝 Registreren" : "🔑 Inloggen"}</>
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
            disabled={isLoading}
          >
            {isRegistering ? "Al een account? Inloggen" : "Nog geen account? Registreren"}
          </button>
        </div>

        {isRegistering && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-bold text-gray-800 mb-2">📋 Rollen Uitleg:</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span>👁️</span>
                <span>
                  <strong>Viewer:</strong> Kan alleen het havenplan bekijken
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>⚓</span>
                <span>
                  <strong>Havenmeester:</strong> Kan boten beheren en bewerken
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>👨‍💼</span>
                <span>
                  <strong>Admin:</strong> Volledige toegang tot alle functies
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 italic">
              Neem contact op met een administrator om je rol te laten upgraden.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
