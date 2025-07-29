-- Firebase Realtime Database Rules (Public Read Access)
-- Kopieer deze regels naar je Firebase Console > Database > Rules

{
  "rules": {
    // Iedereen kan lezen, alleen ingelogde gebruikers kunnen schrijven
    ".read": true,
    ".write": "auth != null",
    
    // Gebruikers data - alleen voor ingelogde gebruikers
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && (auth.uid == $uid || root.child('users').child(auth.uid).child('role').val() == 'admin')",
        "role": {
          ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
        }
      }
    },
    
    // Uitnodigingen - alleen voor admins
    "invitations": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
    },
    
    // Steigers - iedereen kan lezen, alleen admins kunnen schrijven
    "piers": {
      ".read": true,
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
    },
    
    // Ligplaatsen - iedereen kan lezen, alleen admins kunnen schrijven
    "slots": {
      ".read": true, 
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
    },
    
    // Boten - iedereen kan lezen, havenmeesters en admins kunnen schrijven
    "boats": {
      ".read": true,
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() == 'admin' || root.child('users').child(auth.uid).child('role').val() == 'havenmeester')"
    }
  }
}
