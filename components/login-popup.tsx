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
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [registrationSuccess, setRegistrationSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (isLogin) {
        const result = await login(email, password)
        if (result.success) {
          onClose()
          resetForm()
        } else {
          setError(result.error || "Inloggen mislukt")
        }
      } else {
        const result = await register(email, password, displayName)
        if (result.success) {
          setRegistrationSuccess(true)
          setError("")
        } else {
          setError(result.error || "Registratie mislukt")
        }
      }
    } catch (error: any) {
      setError(error.message || "Er is een fout opgetreden")
    }

    setLoading(false)
  }

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setDisplayName("")
    setError("")
    setIsLogin(true)
    setRegistrationSuccess(false)
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-600">
            {registrationSuccess ? "✅ Registratie Succesvol" : isLogin ? "🔐 Inloggen" : "📝 Registreren"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            aria-label="Sluiten"
          >
            ×
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">{error}</div>}

        {registrationSuccess ? (
          <div className="text-center space-y-4">
            <div className="text-6xl">✅</div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-green-800">Account Aangemaakt!</h3>
              <p className="text-sm text-gray-600">
                Je account voor <strong>{email}</strong> is succesvol aangemaakt.
              </p>
              <p className="text-sm text-gray-600">
                Je account wacht nu op goedkeuring door een administrator. Je krijgt bericht wanneer je kunt inloggen.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2 px-4 bg-blue-600 text-white border-none rounded cursor-pointer text-sm hover:bg-blue-700 transition-colors"
            >
              Sluiten
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
                <input
                  type="password"
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-blue-600 text-white border-none rounded cursor-pointer text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "⏳ Bezig..." : isLogin ? "🔐 Inloggen" : "📝 Account Aanmaken"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError("")
                }}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                {isLogin ? "Nog geen account? Registreer hier" : "Al een account? Log hier in"}
              </button>
            </div>

            {/* Info Section */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-800 mb-2">ℹ️ Hoe werkt het?</h3>
              <div className="text-sm text-blue-700 space-y-2">
                {isLogin ? (
                  <>
                    <p>Nog geen account? Klik op "Registreer hier" om een nieuw account aan te maken.</p>
                    <p>Na registratie moet je account goedgekeurd worden door een administrator.</p>
                  </>
                ) : (
                  <>
                    <p>Na registratie wordt je account ter goedkeuring voorgelegd aan een administrator.</p>
                    <p>Je krijgt bericht wanneer je account is goedgekeurd en je kunt inloggen.</p>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
