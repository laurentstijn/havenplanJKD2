-- Firebase Realtime Database Rules (Public Read Access - FINAL)
-- Kopieer deze regels naar je Firebase Console > Database > Rules

{
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
}
