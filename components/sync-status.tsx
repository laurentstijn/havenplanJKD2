"use client"

import { useState } from "react"

export function SyncStatus() {
  const [message, setMessage] = useState("Verbonden met Firebase")
  const [type, setType] = useState<"success" | "error">("success")

  return (
    <div
      className={`fixed bottom-2 right-2 py-1 px-2 text-white rounded text-xs ${
        type === "success" ? "bg-green-600" : "bg-red-600"
      }`}
    >
      {message}
    </div>
  )
}
