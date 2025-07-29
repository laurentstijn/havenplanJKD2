-- Firebase Realtime Database Rules (FIXED voor data toegang)
-- Kopieer deze regels naar je Firebase Console > Database > Rules

{
  "rules": {
    // Basis toegang voor alle ingelogde gebruikers
    ".read": "auth != null",
    ".write": "auth != null",
    
    // Gebruikers data
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && (auth.uid == $uid || root.child('users').child(auth.uid).child('role').val() == 'admin')",
        "role": {
          // Alleen admins mogen rollen wijzigen
          ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
        }
      }
    },
    
    // Uitnodigingen - alleen admins
    "invitations": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
    },
    
    // Steigers - iedereen kan lezen, alleen admins kunnen schrijven
    "piers": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
    },
    
    // Ligplaatsen - iedereen kan lezen, alleen admins kunnen schrijven
    "slots": {
      ".read": "auth != null", 
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
    },
    
    // Boten - iedereen kan lezen, havenmeesters en admins kunnen schrijven
    "boats": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() == 'admin' || root.child('users').child(auth.uid).child('role').val() == 'havenmeester')"
    }
  }
}
