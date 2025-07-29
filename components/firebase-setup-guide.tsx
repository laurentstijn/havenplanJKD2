"use client"

import { useState } from "react"

export function FirebaseSetupGuide() {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[700px] max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-red-600">🚨 Firebase Database Setup - URGENT</h2>
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-bold text-red-800 mb-2">🚨 PROBLEEM GEDETECTEERD</h3>
            <p className="text-red-700 text-sm">
              De Firebase Database Rules blokkeren toegang tot de data. Daarom zie je geen boten, steigers of
              ligplaatsen.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-gray-800">🔧 OPLOSSING - Volg deze stappen EXACT:</h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong>Open Firebase Console:</strong>
                  <br />
                  <a
                    href="https://console.firebase.google.com/project/testenhavenplan/database/testenhavenplan-default-rtdb/rules"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800 break-all"
                  >
                    https://console.firebase.google.com/project/testenhavenplan/database/testenhavenplan-default-rtdb/rules
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong>Vervang ALLE regels met onderstaande code:</strong>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
              <div className="mb-2 text-yellow-400">// Kopieer deze VOLLEDIGE code:</div>
              <pre className="whitespace-pre-wrap">
                {`{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && (auth.uid == $uid || root.child('users').child(auth.uid).child('role').val() == 'admin')",
        "role": {
          ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
        }
      }
    },
    "invitations": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
    },
    "piers": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
    },
    "slots": {
      ".read": "auth != null", 
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
    },
    "boats": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() == 'admin' || root.child('users').child(auth.uid).child('role').val() == 'havenmeester')"
    }
  }
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong>Klik "Publiceren" (Publish)</strong> om de regels op te slaan
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <strong>Ververs deze pagina</strong> om de wijzigingen te testen
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-bold text-green-800 mb-2">✅ Na het instellen zie je:</h3>
            <ul className="text-green-700 text-sm space-y-1">
              <li>• Alle boten uit de database (hopelijk je 178 boten!)</li>
              <li>• Steigers en ligplaatsen</li>
              <li>• Geen permission denied errors meer</li>
              <li>• Werkende gebruikersbeheer</li>
            </ul>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-bold text-yellow-800 mb-2">⚠️ Belangrijk:</h3>
            <p className="text-yellow-700 text-sm">
              Als je nog steeds geen boten ziet na het instellen van de regels, dan staan je 178 boten waarschijnlijk
              niet in Firebase maar ergens anders (lokaal bestand, andere database, etc.).
            </p>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => setIsOpen(false)}
            className="py-2 px-4 bg-gray-500 text-white border-none rounded cursor-pointer text-sm hover:bg-gray-600 transition-colors"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  )
}
