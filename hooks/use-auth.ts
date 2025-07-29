"use client"

import { useState, useEffect } from "react"
import { useFirebaseContext } from "@/components/auth-provider"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { ref, get, set } from "firebase/database"
import type { UserRole } from "@/types"

interface UserProfile {
  role: UserRole
  displayName: string
  email: string
  createdAt: string
  lastLogin?: string
}

export function useAuth() {
  const { auth, database, isConnected } = useFirebaseContext()
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth || !database || !isConnected) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        try {
          // First, try to get existing user profile
          const profileRef = ref(database, `users/${user.uid}`)
          const snapshot = await get(profileRef)

          if (snapshot.exists()) {
            // User exists, update last login
            const profile = snapshot.val()
            const updatedProfile = {
              ...profile,
              lastLogin: new Date().toISOString(),
            }
            await set(profileRef, updatedProfile)
            setUserProfile(updatedProfile)
          } else {
            // New user - check for invitations
            let invitedRole: UserRole = "viewer" // Default rol is altijd viewer

            try {
              // Try to get invitations (this might fail if user doesn't have permission yet)
              const invitationsRef = ref(database, "invitations")
              const invitationsSnapshot = await get(invitationsRef)

              if (invitationsSnapshot.exists()) {
                const invitations = invitationsSnapshot.val()
                const userInvitation = Object.entries(invitations).find(
                  ([_, invitation]: [string, any]) =>
                    invitation.email === user.email && invitation.status === "pending",
                )

                if (userInvitation) {
                  invitedRole = userInvitation[1].role
                  // Mark invitation as accepted
                  await set(ref(database, `invitations/${userInvitation[0]}/status`), "accepted")
                  console.log(`User ${user.email} accepted invitation with role: ${invitedRole}`)
                }
              }
            } catch (invitationError) {
              // If we can't read invitations, that's okay - user will get default role
              console.log("Could not check invitations, using default viewer role")
            }

            // Create new user profile - altijd met de rol die bepaald is door uitnodiging of default viewer
            const defaultProfile: UserProfile = {
              role: invitedRole, // Dit is altijd "viewer" tenzij er een uitnodiging was
              displayName: user.email?.split("@")[0] || "Gebruiker",
              email: user.email || "",
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
            }

            await set(profileRef, defaultProfile)
            setUserProfile(defaultProfile)
            console.log(`New user created with role: ${invitedRole}`)
          }
        } catch (error) {
          console.error("Error handling user authentication:", error)
          // If there's any error, set a basic profile with viewer role
          setUserProfile({
            role: "viewer", // Altijd viewer bij fouten
            displayName: user.email?.split("@")[0] || "Gebruiker",
            email: user.email || "",
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          })
        }
      } else {
        setUserProfile(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [auth, database, isConnected])

  const login = async (email: string, password: string) => {
    if (!auth || !isConnected) {
      return { success: false, error: "Firebase niet beschikbaar" }
    }

    try {
      await signInWithEmailAndPassword(auth, email, password)
      return { success: true }
    } catch (error: any) {
      let errorMessage = "Inloggen mislukt"

      switch (error.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          errorMessage = "Ongeldige inloggegevens"
          break
        case "auth/too-many-requests":
          errorMessage = "Te veel pogingen. Probeer later opnieuw."
          break
        case "auth/network-request-failed":
          errorMessage = "Netwerkfout. Controleer je internetverbinding."
          break
      }

      return { success: false, error: errorMessage }
    }
  }

  const register = async (email: string, password: string, displayName: string, role: UserRole = "viewer") => {
    if (!auth || !database || !isConnected) {
      return { success: false, error: "Firebase niet beschikbaar" }
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)

      // Nieuwe gebruikers krijgen ALTIJD de rol "viewer", ongeacht wat er wordt meegegeven
      // Tenzij er een uitnodiging bestaat (dit wordt afgehandeld in onAuthStateChanged)
      const profile: UserProfile = {
        role: "viewer", // Geforceerd naar viewer
        displayName,
        email,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      }

      await set(ref(database, `users/${result.user.uid}`), profile)
      console.log(`User registered with forced viewer role: ${email}`)
      return { success: true }
    } catch (error: any) {
      let errorMessage = "Registratie mislukt"

      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "Email adres is al in gebruik"
          break
        case "auth/weak-password":
          errorMessage = "Wachtwoord is te zwak"
          break
        case "auth/invalid-email":
          errorMessage = "Ongeldig email adres"
          break
      }

      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    if (!auth) return
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const updateUserRole = async (newRole: UserRole) => {
    if (!user || !database || !userProfile || !isConnected) return

    try {
      const updatedProfile = { ...userProfile, role: newRole }
      await set(ref(database, `users/${user.uid}`), updatedProfile)
      setUserProfile(updatedProfile)
      console.log(`User role updated to: ${newRole}`)
    } catch (error) {
      console.error("Error updating user role:", error)
    }
  }

  return {
    user,
    userProfile,
    loading,
    login,
    register,
    logout,
    updateUserRole,
  }
}
