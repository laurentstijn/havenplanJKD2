"use client"

import { useState, useEffect } from "react"
import { useFirebaseContext } from "@/components/auth-provider"
import { ref, get, set, remove, push } from "firebase/database"
import { useAuth } from "@/hooks/use-auth"
import type { UserRole, Zone } from "@/types"

interface UserData {
  uid: string
  email: string
  displayName: string
  role: UserRole
  createdAt: string
  lastLogin?: string
}

interface UserManagementPopupProps {
  isOpen: boolean
  onClose: () => void
  currentUserRole: UserRole
}

export function UserManagementPopup({ isOpen, onClose, currentUserRole }: UserManagementPopupProps) {
  const { database } = useFirebaseContext()
  const { user } = useAuth()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserRole, setNewUserRole] = useState<UserRole>("viewer")
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState("")

  // Zone management functies
  const [zones, setZones] = useState<Zone[]>([])

  useEffect(() => {
    if (isOpen && database && user) {
      loadUsers()
      loadZones()
    }
  }, [isOpen, database, user])

  const loadZones = async () => {
    if (!database || !user) return

    try {
      const zonesRef = ref(database, "zones")
      const snapshot = await get(zonesRef)

      if (snapshot.exists()) {
        const zonesData = snapshot.val()
        const zonesList: Zone[] = Array.isArray(zonesData) ? zonesData : Object.values(zonesData)
        setZones(zonesList)
      } else {
        setZones([])
      }
    } catch (error: any) {
      console.error("Fout bij laden zones:", error)
    }
  }

  const getUserZones = (userUid: string): Zone[] => {
    return zones.filter((zone) => (zone.havenmeesters || []).includes(userUid))
  }

  const getAvailableZonesForUser = (userUid: string): Zone[] => {
    return zones.filter((zone) => !(zone.havenmeesters || []).includes(userUid))
  }

  const assignUserToZone = async (userUid: string, zoneId: number) => {
    if (!database || !user) return

    try {
      const zone = zones.find((z) => z.id === zoneId)
      if (!zone) return

      const updatedHavenmeesters = [...(zone.havenmeesters || []), userUid]
      const updatedZone = { ...zone, havenmeesters: updatedHavenmeesters }

      // Update in database
      const zoneRef = ref(database, `zones`)
      const updatedZones = zones.map((z) => (z.id === zoneId ? updatedZone : z))
      await set(zoneRef, updatedZones)

      // Update local state
      setZones(updatedZones)
      setError("")

      const userName = users.find((u) => u.uid === userUid)?.displayName || "Gebruiker"
      alert(`✅ ${userName} toegevoegd aan zone "${zone.name}"`)
    } catch (error: any) {
      console.error("Fout bij toewijzen zone:", error)
      setError(`Fout bij toewijzen zone: ${error.message}`)
    }
  }

  const removeUserFromZone = async (userUid: string, zoneId: number) => {
    if (!database || !user) return

    try {
      const zone = zones.find((z) => z.id === zoneId)
      if (!zone) return

      const updatedHavenmeesters = (zone.havenmeesters || []).filter((uid) => uid !== userUid)
      const updatedZone = { ...zone, havenmeesters: updatedHavenmeesters }

      // Update in database
      const zoneRef = ref(database, `zones`)
      const updatedZones = zones.map((z) => (z.id === zoneId ? updatedZone : z))
      await set(zoneRef, updatedZones)

      // Update local state
      setZones(updatedZones)
      setError("")

      const userName = users.find((u) => u.uid === userUid)?.displayName || "Gebruiker"
      alert(`✅ ${userName} verwijderd uit zone "${zone.name}"`)
    } catch (error: any) {
      console.error("Fout bij verwijderen uit zone:", error)
      setError(`Fout bij verwijderen uit zone: ${error.message}`)
    }
  }

  useEffect(() => {
    if (isOpen && database && user) {
      loadUsers()
    }
  }, [isOpen, database, user])

  // Only allow admin to access this component
  if (currentUserRole !== "admin") {
    return null
  }

  const loadUsers = async () => {
    if (!database || !user) return

    setLoading(true)
    setError("")

    try {
      const usersRef = ref(database, "users")
      const snapshot = await get(usersRef)

      if (snapshot.exists()) {
        const usersData = snapshot.val()
        const usersList: UserData[] = Object.entries(usersData).map(([uid, data]: [string, any]) => ({
          uid,
          ...data,
        }))
        setUsers(usersList.sort((a, b) => a.displayName.localeCompare(b.displayName)))
      } else {
        setUsers([])
      }
    } catch (error: any) {
      console.error("Fout bij laden gebruikers:", error)

      // Specifieke foutafhandeling
      if (error.code === "PERMISSION_DENIED") {
        setError("Geen toegang tot gebruikersgegevens. Controleer je rechten of Firebase regels.")
      } else {
        setError(`Kon gebruikers niet laden: ${error.message || "Onbekende fout"}`)
      }

      // Fallback: toon alleen huidige gebruiker
      if (user) {
        setUsers([
          {
            uid: user.uid,
            email: user.email || "",
            displayName: user.email?.split("@")[0] || "Huidige gebruiker",
            role: currentUserRole,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          },
        ])
      }
    }

    setLoading(false)
  }

  const updateUserRole = async (uid: string, newRole: UserRole) => {
    if (!database || !user) return

    try {
      // Get current user data first
      const userRef = ref(database, `users/${uid}`)
      const snapshot = await get(userRef)

      if (snapshot.exists()) {
        const userData = snapshot.val()
        const updatedUser = { ...userData, role: newRole }
        await set(userRef, updatedUser)

        // Update local state
        setUsers((prev) => prev.map((user) => (user.uid === uid ? { ...user, role: newRole } : user)))

        setError("")
        alert("Gebruikersrol bijgewerkt!")
      }
    } catch (error: any) {
      console.error("Fout bij bijwerken rol:", error)
      if (error.code === "PERMISSION_DENIED") {
        setError("Geen toegang om gebruikersrollen te wijzigen")
      } else {
        setError(`Fout bij bijwerken gebruikersrol: ${error.message}`)
      }
    }
  }

  const addUserByEmail = async () => {
    if (!database || !newUserEmail.trim() || !user) return

    setError("")

    try {
      // Check if user already exists
      const usersRef = ref(database, "users")
      const snapshot = await get(usersRef)

      if (snapshot.exists()) {
        const usersData = snapshot.val()
        const existingUser = Object.entries(usersData).find(
          ([_, userData]: [string, any]) => userData.email === newUserEmail.trim(),
        )

        if (existingUser) {
          const [uid] = existingUser
          await updateUserRole(uid, newUserRole)
          setNewUserEmail("")
          setNewUserRole("viewer")
          return
        }
      }

      // Create invitation for new user
      const invitationsRef = ref(database, "invitations")
      await push(invitationsRef, {
        email: newUserEmail.trim(),
        role: newUserRole,
        invitedAt: new Date().toISOString(),
        invitedBy: user.uid,
        status: "pending",
      })

      alert(`Uitnodiging verstuurd naar ${newUserEmail} met rol ${newUserRole}`)
      setNewUserEmail("")
      setNewUserRole("viewer")
    } catch (error: any) {
      console.error("Fout bij toevoegen gebruiker:", error)
      if (error.code === "PERMISSION_DENIED") {
        setError("Geen toegang om gebruikers toe te voegen")
      } else {
        setError(`Fout bij toevoegen gebruiker: ${error.message}`)
      }
    }
  }

  const removeUser = async (uid: string, email: string) => {
    if (!database || !user) return

    // Prevent removing yourself
    if (uid === user.uid) {
      alert("Je kunt jezelf niet verwijderen!")
      return
    }

    if (confirm(`Weet je zeker dat je ${email} wilt verwijderen?`)) {
      try {
        const userRef = ref(database, `users/${uid}`)
        await remove(userRef)

        setUsers((prev) => prev.filter((user) => user.uid !== uid))
        setError("")
        alert("Gebruiker verwijderd!")
      } catch (error: any) {
        console.error("Fout bij verwijderen gebruiker:", error)
        if (error.code === "PERMISSION_DENIED") {
          setError("Geen toegang om gebruikers te verwijderen")
        } else {
          setError(`Fout bij verwijderen gebruiker: ${error.message}`)
        }
      }
    }
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

  const filteredUsers = users.filter(
    (user) =>
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[800px] max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-600">👥 Gebruikersbeheer</h2>
          <button
            onClick={onClose}
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
              <div>
                <div className="font-bold">Fout:</div>
                <div>{error}</div>
                {error.includes("Firebase regels") && (
                  <div className="mt-2 text-xs">
                    <strong>Oplossing:</strong> Stel Firebase Database Rules in op:
                    <pre className="bg-gray-100 p-2 mt-1 rounded text-black">
                      {`{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}`}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Nieuwe gebruiker toevoegen */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-bold mb-3 text-blue-800">Gebruiker Toevoegen/Uitnodigen</h3>
          <div className="flex gap-3">
            <input
              type="email"
              className="flex-1 p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email adres"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
            />
            <select
              className="p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
            >
              <option value="viewer">👁️ Viewer</option>
              <option value="havenmeester">⚓ Havenmeester</option>
              <option value="admin">👨‍💼 Admin</option>
            </select>
            <button
              onClick={addUserByEmail}
              className="py-2 px-4 bg-blue-600 text-white border-none rounded cursor-pointer text-sm hover:bg-blue-700 transition-colors"
              disabled={!newUserEmail.trim() || loading}
            >
              ➕ Toevoegen
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Als de gebruiker al bestaat wordt de rol bijgewerkt. Anders wordt een uitnodiging aangemaakt.
          </p>
        </div>

        {/* Zoeken */}
        <div className="mb-4">
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="🔍 Zoek gebruikers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Gebruikerslijst */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-800">Huidige Gebruikers ({filteredUsers.length})</h3>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Laden...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              {searchTerm ? "Geen gebruikers gevonden" : "Nog geen gebruikers"}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsers.map((userData) => (
                <div key={userData.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {userData.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">
                        {userData.displayName}
                        {userData.uid === user?.uid && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">(Jij)</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">{userData.email}</div>
                      {userData.lastLogin && (
                        <div className="text-xs text-gray-500">
                          Laatst ingelogd: {new Date(userData.lastLogin).toLocaleDateString()}
                        </div>
                      )}

                      {/* Toegewezen zones tonen voor havenmeesters */}
                      {userData.role === "havenmeester" && (
                        <div className="mt-1">
                          <div className="text-xs text-gray-600 mb-1">Toegewezen zones:</div>
                          <div className="flex flex-wrap gap-1">
                            {getUserZones(userData.uid).map((zone) => (
                              <div
                                key={zone.id}
                                className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                              >
                                <div
                                  className="w-3 h-3 rounded border"
                                  style={{
                                    backgroundColor: zone.color,
                                    borderColor: zone.color.replace("0.3", "0.8"),
                                  }}
                                ></div>
                                <span>{zone.name}</span>
                                <button
                                  onClick={() => removeUserFromZone(userData.uid, zone.id)}
                                  className="text-red-600 hover:text-red-800 ml-1"
                                  title="Zone toegang intrekken"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            {getUserZones(userData.uid).length === 0 && (
                              <span className="text-xs text-gray-500 italic">Geen zones toegewezen</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getRoleColor(userData.role)}`}>
                      {getRoleIcon(userData.role)} {userData.role}
                    </span>

                    <select
                      className="p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={userData.role}
                      onChange={(e) => updateUserRole(userData.uid, e.target.value as UserRole)}
                      disabled={loading || userData.uid === user?.uid}
                    >
                      <option value="viewer">👁️ Viewer</option>
                      <option value="havenmeester">⚓ Havenmeester</option>
                      <option value="admin">👨‍💼 Admin</option>
                    </select>

                    {/* Zone toewijzing voor havenmeesters */}
                    {userData.role === "havenmeester" && (
                      <div className="flex items-center gap-2">
                        <select
                          className="p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[120px]"
                          onChange={(e) => {
                            if (e.target.value) {
                              assignUserToZone(userData.uid, Number.parseInt(e.target.value))
                              e.target.value = "" // Reset selection
                            }
                          }}
                          disabled={loading}
                        >
                          <option value="">+ Zone toewijzen</option>
                          {getAvailableZonesForUser(userData.uid).map((zone) => (
                            <option key={zone.id} value={zone.id}>
                              🏢 {zone.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      onClick={() => removeUser(userData.uid, userData.email)}
                      className="py-1 px-2 bg-red-600 text-white border-none rounded cursor-pointer text-xs hover:bg-red-700 transition-colors disabled:opacity-50"
                      disabled={loading || userData.uid === user?.uid}
                      title={userData.uid === user?.uid ? "Je kunt jezelf niet verwijderen" : "Gebruiker verwijderen"}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="py-2 px-4 bg-gray-500 text-white border-none rounded cursor-pointer text-sm hover:bg-gray-600 transition-colors"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  )
}
