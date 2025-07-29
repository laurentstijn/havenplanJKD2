"use client"

import { useState } from "react"
import { LoginPopup } from "./login-popup"
import { UserManagementPopup } from "./user-management-popup"
import { useAuth } from "@/hooks/use-auth"
import type { UserRole } from "@/types"

interface AuthContainerProps {
  currentUserRole: UserRole
  onRoleChange: (role: UserRole) => void
}

export function AuthContainer({ currentUserRole, onRoleChange }: AuthContainerProps) {
  const { user, userProfile, logout, loading } = useAuth()
  const [showLoginPopup, setShowLoginPopup] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)

  const handleLogout = async () => {
    await logout()
    onRoleChange("viewer")
  }

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "Administrator"
      case "havenmeester":
        return "Havenmeester"
      case "viewer":
        return "Viewer"
      default:
        return "Onbekend"
    }
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "text-red-600"
      case "havenmeester":
        return "text-blue-600"
      case "viewer":
        return "text-gray-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <>
      <div className="relative w-full py-5 bg-blue-100">
        {user && userProfile ? (
          <div className="absolute left-5 top-1/2 transform -translate-y-1/2 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {userProfile.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-bold text-gray-800">{userProfile.displayName}</div>
                <div className={`text-xs ${getRoleColor(userProfile.role)}`}>
                  {getRoleDisplayName(userProfile.role)}
                </div>
              </div>
            </div>

            {/* Admin only: User Management button */}
            {userProfile.role === "admin" && (
              <button
                className="py-2 px-4 bg-green-600 text-white border-none rounded cursor-pointer text-sm hover:bg-green-700 transition-colors"
                onClick={() => setShowUserManagement(true)}
              >
                👥 Gebruikers
              </button>
            )}

            <button
              className="py-2 px-4 bg-red-600 text-white border-none rounded cursor-pointer text-sm hover:bg-red-700 transition-colors"
              onClick={handleLogout}
            >
              🚪 Uitloggen
            </button>
          </div>
        ) : (
          <div className="absolute left-5 top-1/2 transform -translate-y-1/2 flex items-center gap-3">
            <button
              className="font-bold py-2 px-4 rounded border-none cursor-pointer bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              onClick={() => setShowLoginPopup(true)}
            >
              🔐 Inloggen
            </button>
            <div className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg shadow-sm">
              💡 Iedereen kan kijken, inloggen voor bewerken
            </div>
          </div>
        )}

        

        <h1 className="m-0 text-center text-3xl text-blue-600">Jachthaven Beheersysteem</h1>
      </div>

      <LoginPopup isOpen={showLoginPopup} onClose={() => setShowLoginPopup(false)} />
      <UserManagementPopup
        isOpen={showUserManagement}
        onClose={() => setShowUserManagement(false)}
        currentUserRole={userProfile?.role || "viewer"}
      />
    </>
  )
}
