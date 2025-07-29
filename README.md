# Marina Management System

Een volledig jachthaven beheersysteem gebouwd met Next.js, Firebase en TypeScript.

## Features

- 🚤 **Boot Management**: Voeg boten toe, bewerk en beheer ligplaatsen
- ⚓ **Steiger & Ligplaats Beheer**: Teken steigers en ligplaatsen op het havenplan
- 🏢 **Zone Management**: Verdeel de haven in zones met toegangscontrole
- 👥 **Gebruikersbeheer**: Verschillende rollen (admin, havenmeester, viewer)
- 🔥 **Firebase Integration**: Real-time database en authenticatie
- 📱 **Responsive Design**: Werkt op desktop, tablet en mobiel

## Demo

De applicatie draait in demo-modus als Firebase niet is geconfigureerd.

## Deployment

### Stap 1: GitHub Repository
1. Download de code van v0.dev
2. Maak een nieuwe GitHub repository
3. Upload de bestanden

### Stap 2: Vercel Deployment
1. Ga naar [vercel.com](https://vercel.com)
2. Importeer je GitHub repository
3. Deploy automatisch

### Stap 3: Firebase Setup (Optioneel)
1. Maak een Firebase project aan
2. Voeg environment variables toe in Vercel
3. Configureer database rules

## Environment Variables

Voor productie gebruik, voeg deze variabelen toe in Vercel:

\`\`\`
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.europe-west1.firebasedatabase.app/
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
\`\`\`

## Local Development

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
\`\`\`

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Database**: Firebase Realtime Database
- **Authentication**: Firebase Auth
- **Deployment**: Vercel

## License

MIT License
