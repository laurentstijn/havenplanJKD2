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
import { ref, get, set, push } from "firebase/database"
import type { UserRole } from "@/types"

interface UserProfile {
  role: UserRole
  displayName: string
  email: string
  createdAt: string
  lastLogin?: string
  status?: "pending" | "approved" | "rejected"
}

export interface RecoveryRequest {
  id: string
  email: string
  displayName: string
  requestedAt: string
  status: "pending" | "approved" | "rejected"
}

export function useAuth() {
  const { auth, database, isConnected } = useFirebaseContext()
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([])

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
            const profile = snapshot.val()

            // Check if user is approved
            if (profile.status === "pending") {
              // User exists but is pending approval - log them out
              await signOut(auth)
              setUserProfile(null)
              return
            }

            // User exists and is approved, update last login
            const updatedProfile = {
              ...profile,
              lastLogin: new Date().toISOString(),
            }
            await set(profileRef, updatedProfile)
            setUserProfile(updatedProfile)
          } else {
            // User authenticated but no profile exists - log them out
            console.warn("User authenticated but no profile found - logging out")
            await signOut(auth)
            setUserProfile(null)
          }
        } catch (error) {
          console.error("Error handling user authentication:", error)
          // If there's any error, log out the user
          await signOut(auth)
          setUserProfile(null)
        }
      } else {
        setUserProfile(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [auth, database, isConnected])

  // Load recovery requests for admins
  useEffect(() => {
    if (!database || !userProfile || userProfile.role !== "admin") {
      setRecoveryRequests([])
      return
    }

    const loadRecoveryRequests = async () => {
      try {
        const requestsRef = ref(database, "recoveryRequests")
        const snapshot = await get(requestsRef)

        if (snapshot.exists()) {
          const requests = Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
            id,
            ...data,
          })) as RecoveryRequest[]

          setRecoveryRequests(requests.filter((req) => req.status === "pending"))
        } else {
          setRecoveryRequests([])
        }
      } catch (error) {
        console.error("Error loading recovery requests:", error)
        setRecoveryRequests([])
      }
    }

    loadRecoveryRequests()
  }, [database, userProfile])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!auth || !database || !isConnected) {
      return { success: false, error: "Firebase niet beschikbaar" }
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password)

      // Check if user profile exists in database
      const profileRef = ref(database, `users/${result.user.uid}`)
      const snapshot = await get(profileRef)

      if (!snapshot.exists()) {
        // User authenticated but no profile exists
        await signOut(auth)
        return {
          success: false,
          error: "Account niet gevonden in database. Probeer opnieuw te registreren.",
        }
      }

      const profile = snapshot.val()

      // Check if user is pending approval
      if (profile.status === "pending") {
        await signOut(auth)
        return {
          success: false,
          error:
            "Je account wacht nog op goedkeuring door een administrator. Je krijgt bericht wanneer je kunt inloggen.",
        }
      }

      // Profile exists and is approved, login successful
      return { success: true }
    } catch (error: any) {
      let errorMessage = "Inloggen mislukt"

      switch (error.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          errorMessage = "Ongeldige inloggegevens. Controleer je email en wachtwoord, of registreer een nieuw account."
          break
        case "auth/too-many-requests":
          errorMessage = "Te veel pogingen. Probeer later opnieuw."
          break
        case "auth/network-request-failed":
          errorMessage = "Netwerkfout. Controleer je internetverbinding."
          break
        case "auth/invalid-email":
          errorMessage = "Ongeldig email adres."
          break
        default:
          errorMessage = `Inloggen mislukt: ${error.message}`
      }

      return { success: false, error: errorMessage }
    }
  }

  const register = async (
    email: string,
    password: string,
    displayName: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!auth || !database || !isConnected) {
      return { success: false, error: "Firebase niet beschikbaar" }
    }

    try {
      // First check if user already exists in database (pending or approved)
      const allUsersRef = ref(database, "users")
      const allUsersSnapshot = await get(allUsersRef)

      if (allUsersSnapshot.exists()) {
        const users = allUsersSnapshot.val()
        const existingUser = Object.values(users).find((user: any) => user.email === email)

        if (existingUser) {
          if (existingUser.status === "pending") {
            return {
              success: false,
              error: "Je hebt al een account dat wacht op goedkeuring. Probeer later in te loggen.",
            }
          } else {
            return {
              success: false,
              error: "Dit email adres heeft al een account. Probeer in te loggen.",
            }
          }
        }
      }

      // Try to create Firebase Auth account
      let authUser: User
      try {
        const result = await createUserWithEmailAndPassword(auth, email, password)
        authUser = result.user
      } catch (authError: any) {
        if (authError.code === "auth/email-already-in-use") {
          // Email exists in Firebase Auth but not in our database
          // This means there's an orphaned Firebase Auth account
          // We'll try to sign in and then create the profile
          try {
            const signInResult = await signInWithEmailAndPassword(auth, email, password)
            authUser = signInResult.user

            // Check if this user already has a profile (shouldn't happen but just in case)
            const profileRef = ref(database, `users/${authUser.uid}`)
            const profileSnapshot = await get(profileRef)

            if (profileSnapshot.exists()) {
              await signOut(auth)
              return {
                success: false,
                error: "Dit email adres heeft al een account. Probeer in te loggen.",
              }
            }
          } catch (signInError: any) {
            return {
              success: false,
              error:
                "Dit email adres is al in gebruik maar het wachtwoord klopt niet. Gebruik een ander email adres of probeer in te loggen met het juiste wachtwoord.",
            }
          }
        } else {
          throw authError
        }
      }

      // Create user profile in database with pending status
      const profile: UserProfile = {
        role: "viewer", // Default role
        displayName,
        email,
        createdAt: new Date().toISOString(),
        status: "pending", // User needs approval
      }

      await set(ref(database, `users/${authUser.uid}`), profile)

      // Log out the user immediately since they need approval
      await signOut(auth)

      console.log(`User registered and pending approval: ${email}`)
      return { success: true }
    } catch (error: any) {
      let errorMessage = "Registratie mislukt"

      switch (error.code) {
        case "auth/weak-password":
          errorMessage = "Wachtwoord is te zwak (minimaal 6 karakters)"
          break
        case "auth/invalid-email":
          errorMessage = "Ongeldig email adres"
          break
        default:
          errorMessage = `Registratie mislukt: ${error.message}`
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

  const submitRecoveryRequest = async (
    email: string,
    displayName: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!database) {
      return { success: false, error: "Firebase niet beschikbaar" }
    }

    try {
      const recoveryRequest = {
        email,
        displayName,
        requestedAt: new Date().toISOString(),
        status: "pending",
      }

      const requestsRef = ref(database, "recoveryRequests")
      await push(requestsRef, recoveryRequest)

      console.log("Recovery request submitted for:", email)
      return { success: true }
    } catch (error: any) {
      console.error("Recovery request error:", error)
      return { success: false, error: `Fout bij indienen verzoek: ${error.message}` }
    }
  }

  const approveRecoveryRequest = async (request: RecoveryRequest): Promise<{ success: boolean; error?: string }> => {
    if (!database || !auth) {
      return { success: false, error: "Firebase niet beschikbaar" }
    }

    try {
      // Create user profile in database
      const userProfile: UserProfile = {
        role: "viewer", // Default role for recovered users
        displayName: request.displayName,
        email: request.email,
        createdAt: new Date().toISOString(),
        status: "approved",
      }

      // We can't create the Firebase Auth user here, but we can create the profile
      // The user will need to reset their password or contact admin for login details
      await set(ref(database, `users/pending_${Date.now()}`), {
        ...userProfile,
        recoveryApproved: true,
        originalEmail: request.email,
      })

      // Mark request as approved
      await set(ref(database, `recoveryRequests/${request.id}/status`), "approved")

      // Remove from pending requests
      setRecoveryRequests((prev) => prev.filter((req) => req.id !== request.id))

      console.log("Recovery request approved for:", request.email)
      return { success: true }
    } catch (error: any) {
      console.error("Recovery approval error:", error)
      return { success: false, error: `Fout bij goedkeuren: ${error.message}` }
    }
  }

  const rejectRecoveryRequest = async (requestId: string): Promise<{ success: boolean; error?: string }> => {
    if (!database) {
      return { success: false, error: "Firebase niet beschikbaar" }
    }

    try {
      await set(ref(database, `recoveryRequests/${requestId}/status`), "rejected")
      setRecoveryRequests((prev) => prev.filter((req) => req.id !== requestId))

      console.log("Recovery request rejected:", requestId)
      return { success: true }
    } catch (error: any) {
      console.error("Recovery rejection error:", error)
      return { success: false, error: `Fout bij afwijzen: ${error.message}` }
    }
  }

  return {
    user,
    userProfile,
    loading,
    recoveryRequests,
    login,
    register,
    logout,
    updateUserRole,
    submitRecoveryRequest,
    approveRecoveryRequest,
    rejectRecoveryRequest,
  }
}
