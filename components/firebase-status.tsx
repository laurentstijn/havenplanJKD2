"use client"

import { useFirebaseContext } from "./auth-provider"
import { useAuth } from "@/hooks/use-auth"
import { useFirebase } from "@/hooks/use-firebase"

export function FirebaseStatus() {
  const { database, auth, isConnected, error } = useFirebaseContext()
  const { user, userProfile } = useAuth()
  const { loading: dataLoading, error: dataError, state, usingDemoData } = useFirebase()

  return null
}
