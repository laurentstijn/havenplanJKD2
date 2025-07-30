"use client"

import { useState, useEffect } from "react"
import { useFirebaseContext } from "@/components/auth-provider"
import { useAuth } from "@/hooks/use-auth"
import { ref, get, set, remove, push } from "firebase/database"
import type { UserRole, Zone } from "@/types"

interface User {
  uid: string
  email: string
  displayName: string
  role: UserRole
  createdAt: string
  lastLogin?: string
  status?: "pending" | "approved" | "rejected"
}

interface Invitation {
  id: string
  email: string
  displayName: string
  role: UserRole
  invitedBy: string
  invitedAt: string
  status: "pending" | "accepted" | "rejected"
}

interface UserManagementPopupProps {
  isOpen: boolean
  onClose: () => void
}

export function UserManagementPopup({ isOpen, onClose }: UserManagementPopupProps) {
  const { database } = useFirebaseContext()
  const { userProfile, recoveryRequests, approveRecoveryRequest, rejectRecoveryRequest } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [pendingUsers, setPendingUsers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeTab, setActiveTab] = useState<"users" | "pending" | "invitations" | "recovery">("users")
  const [newInvitation, setNewInvitation] = useState({
    email: "",
    displayName: "",
    role: "viewer" as UserRole,
  })

  useEffect(() => {
    if (isOpen && database && userProfile?.role === "admin") {
      loadData()
    }
  }, [isOpen, database, userProfile])

  const loadData = async () => {
    if (!database) return

    setLoading(true)
    setError("")
    try {
      // Load users
      const usersRef = ref(database, "users")
      const usersSnapshot = await get(usersRef)

      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val()
        const usersList = Object.entries(usersData).map(([uid, userData]: [string, any]) => ({
          uid,
          ...userData,
        })) as User[]

        // Separate approved and pending users
        const approvedUsers = usersList.filter((user) => user.status !== "pending")
        const pendingUsersList = usersList.filter((user) => user.status === "pending")

        setUsers(approvedUsers)
        setPendingUsers(pendingUsersList)
      } else {
        setUsers([])
        setPendingUsers([])
      }

      // Load zones
      const zonesRef = ref(database, "zones")
      const zonesSnapshot = await get(zonesRef)

      if (zonesSnapshot.exists()) {
        const zonesData = zonesSnapshot.val()
        const zonesList: Zone[] = Array.isArray(zonesData) ? zonesData : Object.values(zonesData)
        setZones(zonesList)
      } else {
        setZones([])
      }

      // Load invitations
      const invitationsRef = ref(database, "invitations")
      const invitationsSnapshot = await get(invitationsRef)

      if (invitationsSnapshot.exists()) {
        const invitationsData = invitationsSnapshot.val()
        const invitationsList = Object.entries(invitationsData).map(([id, invitationData]: [string, any]) => ({
          id,
          ...invitationData,
        })) as Invitation[]

        setInvitations(invitationsList.filter((inv) => inv.status === "pending"))
      } else {
        setInvitations([])
      }
    } catch (error: any) {
      console.error("Error loading data:", error)
      setError(`Fout bij laden gegevens: ${error.message}`)
    }
    setLoading(false)
  }

  const getUserZones = (userUid: string): Zone[] => {
    return zones.filter((zone) => (zone.havenmeesters || []).includes(userUid))
  }

  const getAvailableZonesForUser = (userUid: string): Zone[] => {
    return zones.filter((zone) => !(zone.havenmeesters || []).includes(userUid))
  }

  const assignUserToZone = async (userUid: string, zoneId: number) => {
    if (!database) return

    try {
      const zone = zones.find((z) => z.id === zoneId)
      if (!zone) return

      const updatedHavenmeesters = [...(zone.havenmeesters || []), userUid]
      const updatedZone = { ...zone, havenmeesters: updatedHavenmeesters }

      // Update in database
      const updatedZones = zones.map((z) => (z.id === zoneId ? updatedZone : z))
      await set(ref(database, "zones"), updatedZones)

      // Update local state
      setZones(updatedZones)
      setError("")

      const userName = [...users, ...pendingUsers].find((u) => u.uid === userUid)?.displayName || "Gebruiker"
      setSuccess(`✅ ${userName} toegevoegd aan zone "${zone.name}"`)
      setTimeout(() => setSuccess(""), 3000)
    } catch (error: any) {
      console.error("Fout bij toewijzen zone:", error)
      setError(`Fout bij toewijzen zone: ${error.message}`)
    }
  }

  const removeUserFromZone = async (userUid: string, zoneId: number) => {
    if (!database) return

    try {
      const zone = zones.find((z) => z.id === zoneId)
      if (!zone) return

      const updatedHavenmeesters = (zone.havenmeesters || []).filter((uid) => uid !== userUid)
      const updatedZone = { ...zone, havenmeesters: updatedHavenmeesters }

      // Update in database
      const updatedZones = zones.map((z) => (z.id === zoneId ? updatedZone : z))
      await set(ref(database, "zones"), updatedZones)

      // Update local state
      setZones(updatedZones)
      setError("")

      const userName = [...users, ...pendingUsers].find((u) => u.uid === userUid)?.displayName || "Gebruiker"
      setSuccess(`✅ ${userName} verwijderd uit zone "${zone.name}"`)
      setTimeout(() => setSuccess(""), 3000)
    } catch (error: any) {
      console.error("Fout bij verwijderen uit zone:", error)
      setError(`Fout bij verwijderen uit zone: ${error.message}`)
    }
  }

  const updateUserRole = async (uid: string, newRole: UserRole) => {
    if (!database) return

    try {
      await set(ref(database, `users/${uid}/role`), newRole)
      setUsers((prev) => prev.map((user) => (user.uid === uid ? { ...user, role: newRole } : user)))
      setSuccess("Gebruikersrol bijgewerkt!")
      setTimeout(() => setSuccess(""), 3000)
    } catch (error: any) {
      console.error("Error updating user role:", error)
      setError(`Fout bij bijwerken gebruikersrol: ${error.message}`)
    }
  }

  const removeUser = async (uid: string, email: string) => {
    if (!database) return
    if (!confirm(`Weet je zeker dat je ${email} wilt verwijderen?`)) return

    try {
      await remove(ref(database, `users/${uid}`))
      setUsers((prev) => prev.filter((user) => user.uid !== uid))
      setSuccess(`Gebruiker ${email} verwijderd`)
      setTimeout(() => setSuccess(""), 3000)
    } catch (error: any) {
      console.error("Error removing user:", error)
      setError(`Fout bij verwijderen gebruiker: ${error.message}`)
    }
  }

  const approvePendingUser = async (uid: string, email: string) => {
    if (!database) return

    try {
      await set(ref(database, `users/${uid}/status`), "approved")

      // Move user from pending to approved list
      const userToApprove = pendingUsers.find((user) => user.uid === uid)
      if (userToApprove) {
        const approvedUser = { ...userToApprove, status: "approved" as const }
        setPendingUsers((prev) => prev.filter((user) => user.uid !== uid))
        setUsers((prev) => [...prev, approvedUser])
      }

      setSuccess(`✅ Gebruiker ${email} goedgekeurd!`)
      setTimeout(() => setSuccess(""), 3000)
    } catch (error: any) {
      console.error("Error approving user:", error)
      setError(`Fout bij goedkeuren gebruiker: ${error.message}`)
    }
  }

  const rejectPendingUser = async (uid: string, email: string) => {
    if (!database) return
    if (!confirm(`Weet je zeker dat je ${email} wilt afwijzen? Het account wordt volledig verwijderd.`)) return

    try {
      await remove(ref(database, `users/${uid}`))
      setPendingUsers((prev) => prev.filter((user) => user.uid !== uid))
      setSuccess(`❌ Gebruiker ${email} afgewezen en verwijderd`)
      setTimeout(() => setSuccess(""), 3000)
    } catch (error: any) {
      console.error("Error rejecting pending user:", error)
      setError(`Fout bij afwijzen gebruiker: ${error.message}`)
    }
  }

  const sendInvitation = async () => {
    if (!database || !userProfile) return
    if (!newInvitation.email || !newInvitation.displayName) return

    try {
      const invitation = {
        ...newInvitation,
        invitedBy: userProfile.displayName,
        invitedAt: new Date().toISOString(),
        status: "pending",
      }

      const invitationsRef = ref(database, "invitations")
      await push(invitationsRef, invitation)

      setNewInvitation({ email: "", displayName: "", role: "viewer" })
      loadData() // Refresh data
      setSuccess(`✅ Uitnodiging verstuurd naar ${invitation.email}`)
      setTimeout(() => setSuccess(""), 3000)
    } catch (error: any) {
      console.error("Error sending invitation:", error)
      setError(`Fout bij versturen uitnodiging: ${error.message}`)
    }
  }

  const revokeInvitation = async (invitationId: string, email: string) => {
    if (!database) return

    try {
      await remove(ref(database, `invitations/${invitationId}`))
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId))
      setSuccess(`✅ Uitnodiging voor ${email} ingetrokken`)
      setTimeout(() => setSuccess(""), 3000)
    } catch (error: any) {
      console.error("Error revoking invitation:", error)
      setError(`Fout bij intrekken uitnodiging: ${error.message}`)
    }
  }

  const handleApproveRecovery = async (request: any) => {
    const result = await approveRecoveryRequest(request)
    if (result.success) {
      setSuccess(`✅ Herstelverzoek voor ${request.email} goedgekeurd`)
      setTimeout(() => setSuccess(""), 3000)
    } else {
      setError(result.error || "Fout bij goedkeuren herstelverzoek")
    }
  }

  const handleRejectRecovery = async (requestId: string) => {
    const result = await rejectRecoveryRequest(requestId)
    if (result.success) {
      setSuccess("✅ Herstelverzoek afgewezen")
      setTimeout(() => setSuccess(""), 3000)
    } else {
      setError(result.error || "Fout bij afwijzen herstelverzoek")
    }
  }

  const handleClose = () => {
    onClose()
    setActiveTab("users")
    setNewInvitation({ email: "", displayName: "", role: "viewer" })
    setError("")
    setSuccess("")
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
        return "👑"
      case "havenmeester":
        return "⚓"
      case "viewer":
        return "👁️"
      default:
        return "❓"
    }
  }

  if (!isOpen) return null

  if (userProfile?.role !== "admin") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96">
          <h2 className="text-xl font-bold text-red-600 mb-4">Geen Toegang</h2>
          <p>Je hebt geen rechten om gebruikers te beheren.</p>
          <button onClick={handleClose} className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
            Sluiten
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-600">👥 Gebruikersbeheer</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">
            ×
          </button>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            <div className="flex items-start gap-2">
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded text-green-700 text-sm">
            <div className="flex items-start gap-2">
              <span>✅</span>
              <div>{success}</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "users" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            👤 Gebruikers ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors relative ${
              activeTab === "pending" ? "bg-white text-orange-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            ⏳ Wachtend ({pendingUsers.length})
            {pendingUsers.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {pendingUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("invitations")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "invitations" ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            📧 Uitnodigingen ({invitations.length})
          </button>
          <button
            onClick={() => setActiveTab("recovery")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors relative ${
              activeTab === "recovery" ? "bg-white text-purple-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            🔧 Herstel ({recoveryRequests.length})
            {recoveryRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {recoveryRequests.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Laden...</p>
          </div>
        ) : (
          <>
            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Goedgekeurde Gebruikers</h3>
                {users.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Geen gebruikers gevonden</p>
                ) : (
                  <div className="space-y-3">
                    {users.map((user) => (
                      <div key={user.uid} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                {user.displayName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{user.displayName}</div>
                                <div className="text-sm text-gray-600">{user.email}</div>
                                <div className="text-xs text-gray-500">
                                  Aangemaakt: {new Date(user.createdAt).toLocaleDateString("nl-NL")}
                                  {user.lastLogin && (
                                    <span className="ml-2">
                                      • Laatste login: {new Date(user.lastLogin).toLocaleDateString("nl-NL")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Zone toewijzing voor havenmeesters */}
                            {user.role === "havenmeester" && (
                              <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                                <div className="text-sm font-medium text-blue-800 mb-2">Zone Toewijzingen:</div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {getUserZones(user.uid).map((zone) => (
                                    <div
                                      key={zone.id}
                                      className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                                    >
                                      <div
                                        className="w-3 h-3 rounded-full border"
                                        style={{
                                          backgroundColor: zone.color,
                                          borderColor: zone.color.replace("0.3", "0.8"),
                                        }}
                                      ></div>
                                      <span>{zone.name}</span>
                                      <button
                                        onClick={() => removeUserFromZone(user.uid, zone.id)}
                                        className="text-red-600 hover:text-red-800 ml-1 font-bold"
                                        title="Zone toegang intrekken"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                  {getUserZones(user.uid).length === 0 && (
                                    <span className="text-sm text-gray-500 italic">Geen zones toegewezen</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <select
                                    className="flex-1 p-2 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        assignUserToZone(user.uid, Number.parseInt(e.target.value))
                                        e.target.value = "" // Reset selection
                                      }
                                    }}
                                    disabled={loading}
                                  >
                                    <option value="">+ Zone toewijzen</option>
                                    {getAvailableZonesForUser(user.uid).map((zone) => (
                                      <option key={zone.id} value={zone.id}>
                                        🏢 {zone.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-3 ml-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
                              {getRoleIcon(user.role)} {user.role}
                            </span>
                            <select
                              value={user.role}
                              onChange={(e) => updateUserRole(user.uid, e.target.value as UserRole)}
                              className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="viewer">👁️ Viewer</option>
                              <option value="havenmeester">⚓ Havenmeester</option>
                              <option value="admin">👑 Admin</option>
                            </select>
                            <button
                              onClick={() => removeUser(user.uid, user.email)}
                              className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50"
                              title="Gebruiker verwijderen"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pending Users Tab */}
            {activeTab === "pending" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-800">Wachtende Gebruikers</h3>
                {pendingUsers.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Geen wachtende gebruikers</p>
                ) : (
                  <div className="space-y-2">
                    {pendingUsers.map((user) => (
                      <div
                        key={user.uid}
                        className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 flex items-center">
                            {user.displayName}
                            <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                              Wachtend
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          <div className="text-xs text-gray-500">
                            Geregistreerd: {new Date(user.createdAt).toLocaleDateString("nl-NL")}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => approvePendingUser(user.uid, user.email)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                            title="Gebruiker goedkeuren"
                          >
                            ✅ Goedkeuren
                          </button>
                          <button
                            onClick={() => rejectPendingUser(user.uid, user.email)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                            title="Gebruiker afwijzen"
                          >
                            ❌ Afwijzen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Invitations Tab */}
            {activeTab === "invitations" && (
              <div className="space-y-6">
                {/* Send New Invitation */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-800 mb-4">📧 Nieuwe Uitnodiging Versturen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="email"
                      placeholder="Email adres"
                      value={newInvitation.email}
                      onChange={(e) => setNewInvitation({ ...newInvitation, email: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      placeholder="Naam"
                      value={newInvitation.displayName}
                      onChange={(e) => setNewInvitation({ ...newInvitation, displayName: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <select
                      value={newInvitation.role}
                      onChange={(e) => setNewInvitation({ ...newInvitation, role: e.target.value as UserRole })}
                      className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="viewer">👁️ Viewer</option>
                      <option value="havenmeester">⚓ Havenmeester</option>
                      <option value="admin">👑 Admin</option>
                    </select>
                    <button
                      onClick={sendInvitation}
                      disabled={!newInvitation.email || !newInvitation.displayName}
                      className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      📧 Versturen
                    </button>
                  </div>
                </div>

                {/* Pending Invitations */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Openstaande Uitnodigingen</h3>
                  {invitations.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Geen openstaande uitnodigingen</p>
                  ) : (
                    <div className="space-y-2">
                      {invitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{invitation.displayName}</div>
                            <div className="text-sm text-gray-600">{invitation.email}</div>
                            <div className="text-xs text-gray-500">
                              Uitgenodigd door {invitation.invitedBy} op{" "}
                              {new Date(invitation.invitedAt).toLocaleDateString("nl-NL")} als {invitation.role}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(invitation.role)}`}
                            >
                              {getRoleIcon(invitation.role)} {invitation.role}
                            </span>
                            <button
                              onClick={() => revokeInvitation(invitation.id, invitation.email)}
                              className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                              title="Uitnodiging intrekken"
                            >
                              🗑️ Intrekken
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recovery Tab */}
            {activeTab === "recovery" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-purple-800">Account Herstelverzoeken</h3>
                {recoveryRequests.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Geen herstelverzoeken</p>
                ) : (
                  <div className="space-y-2">
                    {recoveryRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{request.displayName}</div>
                          <div className="text-sm text-gray-600">{request.email}</div>
                          <div className="text-xs text-gray-500">
                            Aangevraagd: {new Date(request.requestedAt).toLocaleDateString("nl-NL")}
                          </div>
                          <div className="text-xs text-purple-600 mt-1">
                            🔧 Account bestaat in Firebase maar profiel ontbreekt in database
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleApproveRecovery(request)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                            title="Herstelverzoek goedkeuren"
                          >
                            ✅ Goedkeuren
                          </button>
                          <button
                            onClick={() => handleRejectRecovery(request.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                            title="Herstelverzoek afwijzen"
                          >
                            ❌ Afwijzen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
