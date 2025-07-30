"use client"

import { useState } from "react"
import { useFirebaseContext } from "@/components/auth-provider"
import { ref, get, set } from "firebase/database"
import { createUserWithEmailAndPassword } from "firebase/auth"
import type { UserRole } from "@/types"

interface InvitationAcceptanceProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface Invitation {
  id: string
  email: string
  role: UserRole
  invitedAt: string
  invitedBy: string
  status: string
}

export function InvitationAcceptance({ isOpen, onClose, onSuccess }: InvitationAcceptanceProps) {
  const { auth, database } = useFirebaseContext()
  const [step, setStep] = useState<"search" | "accept">("search")
  const [email, setEmail] = useState("")
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const searchInvitations = async () => {
    if (!database || !email.trim()) return

    setLoading(true)
    setError("")

    try {
      const invitationsRef = ref(database, "invitations")
      const snapshot = await get(invitationsRef)

      if (snapshot.exists()) {
        const invitationsData = snapshot.val()
        const userInvitations = Object.entries(invitationsData)
          .filter(
            ([_, invitation]: [string, any]) => invitation.email === email.trim() && invitation.status === "pending",
          )
          .map(([id, invitation]: [string, any]) => ({
            id,
            ...invitation,
          }))

        if (userInvitations.length > 0) {
          setInvitations(userInvitations)
          setStep("accept")
        } else {
          setError("Geen openstaande uitnodigingen gevonden voor dit email adres.")
        }
      } else {
        setError("Geen uitnodigingen gevonden.")
      }
    } catch (error: any) {
      console.error("Fout bij zoeken uitnodigingen:", error)
      setError(`Fout bij zoeken uitnodigingen: ${error.message}`)
    }

    setLoading(false)
  }

  const acceptInvitation = async () => {
    if (!auth || !database || !selectedInvitation || !displayName.trim() || !password.trim()) return

    setLoading(true)
    setError("")

    try {
      // Create user account
      const result = await createUserWithEmailAndPassword(auth, selectedInvitation.email, password)

      // Create user profile with invited role
      const profile = {
        role: selectedInvitation.role,
        displayName: displayName.trim(),
        email: selectedInvitation.email,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      }

      await set(ref(database, `users/${result.user.uid}`), profile)

      // Mark invitation as accepted
      await set(ref(database, `invitations/${selectedInvitation.id}/status`), "accepted")

      alert(`✅ Account succesvol aangemaakt met rol: ${selectedInvitation.role}`)
      onSuccess()
      onClose()
      resetForm()
    } catch (error: any) {
      console.error("Fout bij accepteren uitnodiging:", error)

      let errorMessage = "Fout bij accepteren uitnodiging"
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "Er bestaat al een account met dit email adres. Probeer in te loggen."
          break
        case "auth/weak-password":
          errorMessage = "Wachtwoord is te zwak (minimaal 6 karakters)"
          break
        case "auth/invalid-email":
          errorMessage = "Ongeldig email adres"
          break
        default:
          errorMessage = `Fout bij accepteren uitnodiging: ${error.message}`
      }

      setError(errorMessage)
    }

    setLoading(false)
  }

  const resetForm = () => {
    setStep("search")
    setEmail("")
    setInvitations([])
    setSelectedInvitation(null)
    setDisplayName("")
    setPassword("")
    setError("")
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800"
      case "havenmeester":
        return "bg-blue-100 text-blue-800"
      case "viewer":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "👨‍💼"
      case "havenmeester":
        return "⚓"
      case "viewer":
        return "👁️"
      default:
        return "❓"
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-600">📧 Uitnodiging Accepteren</h2>
          <button
            onClick={() => {
              onClose()
              resetForm()
            }}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            aria-label="Sluiten"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            <div className="flex items-start gap-2">
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          </div>
        )}

        {step === "search" && (
          <div className="space-y-4">
            <div>
              <p className="text-gray-600 mb-4">
                Voer je email adres in om te controleren of je uitnodigingen hebt ontvangen.
              </p>
              <input
                type="email"
                className="w-full p-3 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Je email adres"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && searchInvitations()}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={searchInvitations}
                className="flex-1 py-3 px-4 bg-blue-600 text-white border-none rounded cursor-pointer text-sm hover:bg-blue-700 transition-colors"
                disabled={!email.trim() || loading}
              >
                {loading ? "🔍 Zoeken..." : "🔍 Zoek Uitnodigingen"}
              </button>
              <button
                onClick={() => {
                  onClose()
                  resetForm()
                }}
                className="py-3 px-4 bg-gray-500 text-white border-none rounded cursor-pointer text-sm hover:bg-gray-600 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}

        {step === "accept" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold mb-3 text-green-800">🎉 Uitnodigingen gevonden voor {email}</h3>
              <div className="space-y-2 mb-4">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className={`p-3 border rounded cursor-pointer transition-colors ${
                      selectedInvitation?.id === invitation.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-blue-300"
                    }`}
                    onClick={() => setSelectedInvitation(invitation)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-800">Marina Management Systeem</div>
                        <div className="text-sm text-gray-600">
                          Rol:{" "}
                          <span className={`px-2 py-1 rounded text-xs ${getRoleColor(invitation.role)}`}>
                            {getRoleIcon(invitation.role)} {invitation.role}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Uitgenodigd: {new Date(invitation.invitedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-blue-600">{selectedInvitation?.id === invitation.id ? "✅" : "⭕"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedInvitation && (
              <div className="space-y-3 p-4 bg-green-50 rounded border border-green-200">
                <h4 className="font-bold text-green-800">Account Gegevens</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weergavenaam</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Je naam"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
                  <input
                    type="password"
                    className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Minimaal 6 karakters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep("search")
                  setSelectedInvitation(null)
                  setDisplayName("")
                  setPassword("")
                  setError("")
                }}
                className="py-3 px-4 bg-gray-500 text-white border-none rounded cursor-pointer text-sm hover:bg-gray-600 transition-colors"
              >
                ← Terug
              </button>
              <button
                onClick={acceptInvitation}
                className="flex-1 py-3 px-4 bg-green-600 text-white border-none rounded cursor-pointer text-sm hover:bg-green-700 transition-colors"
                disabled={!selectedInvitation || !displayName.trim() || !password.trim() || loading}
              >
                {loading ? "✅ Accepteren..." : "✅ Uitnodiging Accepteren & Account Aanmaken"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
