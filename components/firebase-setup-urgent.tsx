"use client"

import { useState } from "react"

interface FirebaseSetupUrgentProps {
  isVisible: boolean
}

export function FirebaseSetupUrgent({ isVisible }: FirebaseSetupUrgentProps) {
  const [isOpen, setIsOpen] = useState(isVisible)
  const [step, setStep] = useState(1)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-red-600 bg-opacity-95 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-[900px] max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🚨</div>
          <h1 className="text-3xl font-bold text-red-600 mb-2">FIREBASE SETUP VEREIST</h1>
          <p className="text-gray-700 text-lg">
            De app draait nu op demo data. Voor echte data moet Firebase worden ingesteld.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⚠️</span>
            <span className="font-bold text-yellow-800">Huidige Status: Demo Modus</span>
          </div>
          <p className="text-yellow-700 text-sm">
            Je ziet nu 2 demo boten. Na Firebase setup zie je je echte 178 boten (als die in Firebase staan).
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    step >= stepNum ? "bg-blue-600" : "bg-gray-400"
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 3 && <div className="w-12 h-1 bg-gray-300 mx-2"></div>}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800">Stap 1: Open Firebase Console</h3>
              <p className="text-gray-600">Klik op de knop hieronder om Firebase Console te openen:</p>
              <div className="text-center">
                <a
                  href="https://console.firebase.google.com/project/testenhavenplan/database/testenhavenplan-default-rtdb/rules"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-bold hover:bg-blue-700 transition-colors"
                  onClick={() => setStep(2)}
                >
                  🔗 Open Firebase Console
                </a>
              </div>
              <p className="text-sm text-gray-500 text-center">(Opent in nieuw tabblad - laat deze pagina open)</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800">Stap 2: Kopieer en Plak Rules</h3>
              <p className="text-gray-600">
                Selecteer ALLE tekst in het Firebase Rules veld en vervang het met onderstaande code:
              </p>

              <div className="relative">
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto max-h-96">
                  <pre className="whitespace-pre-wrap">
                    {`{
  "rules": {
    ".read": true,
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
      ".read": true,
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
    },
    "slots": {
      ".read": true, 
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
    },
    "boats": {
      ".read": true,
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() == 'admin' || root.child('users').child(auth.uid).child('role').val() == 'havenmeester')"
    }
  }
}`}
                  </pre>
                </div>
                <button
                  onClick={() => {
                    const code = `{
  "rules": {
    ".read": true,
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
      ".read": true,
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
    },
    "slots": {
      ".read": true, 
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
    },
    "boats": {
      ".read": true,
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() == 'admin' || root.child('users').child(auth.uid).child('role').val() == 'havenmeester')"
    }
  }
}`
                    navigator.clipboard.writeText(code)
                    alert("✅ Code gekopieerd naar clipboard!\n\nGa nu naar Firebase Console en plak de code.")
                  }}
                  className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  📋 Kopieer Code
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-blue-800 mb-2">📝 Instructies:</h4>
                <ol className="text-blue-700 text-sm space-y-1">
                  <li>1. Klik "📋 Kopieer Code" hierboven</li>
                  <li>2. Ga naar het Firebase Console tabblad</li>
                  <li>3. Selecteer ALLE tekst in het Rules veld (Ctrl+A)</li>
                  <li>4. Plak de nieuwe code (Ctrl+V)</li>
                  <li>5. Klik "Publiceren" (Publish) in Firebase</li>
                </ol>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setStep(3)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors"
                >
                  ✅ Ik heb de rules gepubliceerd
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center">
              <h3 className="text-xl font-bold text-gray-800">Stap 3: Test de Verbinding</h3>
              <p className="text-gray-600">Klik hieronder om te testen of Firebase nu werkt:</p>

              <button
                onClick={() => {
                  window.location.reload()
                }}
                className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-bold hover:bg-green-700 transition-colors"
              >
                🔄 Test Firebase Verbinding
              </button>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <h4 className="font-bold text-green-800 mb-2">✅ Als het werkt zie je:</h4>
                <ul className="text-green-700 text-sm space-y-1">
                  <li>• Geen rode error schermen meer</li>
                  <li>• Je echte boten data (hopelijk 178 boten!)</li>
                  <li>• Status indicator toont "Firebase Verbonden"</li>
                  <li>• Alle functies werken normaal</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <h4 className="font-bold text-yellow-800 mb-2">⚠️ Als je nog steeds demo data ziet:</h4>
                <p className="text-yellow-700 text-sm">
                  Dan staan je 178 boten waarschijnlijk niet in Firebase. Je moet ze eerst importeren in de Firebase
                  Database.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={() => setIsOpen(false)}
            className="py-2 px-4 bg-gray-500 text-white border-none rounded cursor-pointer text-sm hover:bg-gray-600 transition-colors"
          >
            ❌ Sluiten (Demo Modus)
          </button>

          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="py-2 px-4 bg-blue-600 text-white border-none rounded cursor-pointer text-sm hover:bg-blue-700 transition-colors"
            >
              ← Vorige Stap
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
