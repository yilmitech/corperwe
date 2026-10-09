# CorperWe Setup Guide (NYSC 12/12 Anonymous Messages)

CorperWe is a mobile-first web application designed for Nigerian NYSC Corps members celebrating their 12/12 Passing Out Parade (POP) month. It allows corpers to generate a custom 12/12 POP link, download a high-res 1080x1920 Instagram/WhatsApp story card, and receive anonymous confessions, prayers, and memories in a private inbox.

---

## 1. Firebase Setup

### A. Create Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new Firebase project (or use the provisioned project `oval-guide-rdpgw`).
3. Enable **Google Sign-In** under **Authentication > Sign-in method**:
   - Click "Add new provider" -> Select **Google**.
   - Enable it and save.
   - Under authorized domains, add your production/development domain (e.g. `localhost`, your custom domain, or your Cloud Run app URL).

### B. Enable Firestore Database
1. Under **Build > Firestore Database**, click **Create database**.
2. Select your preferred location (e.g. `europe-west2`).
3. Choose Production rules or apply the secure `firestore.rules` provided in this project.

### C. Deploy Firestore Security Rules
Deploy `firestore.rules` using the Firebase CLI or directly paste them into the Firestore Console > Rules tab:
```bash
firebase deploy --only firestore:rules
```

Rules summary:
- Anyone can read a corper's `/pops/{slug}` document to view the name and prompt.
- Only authenticated corpers can create/update their own pop link (`ownerId == request.auth.uid`).
- Anyone can submit an anonymous message under `/pops/{slug}/messages/{id}` (strictly validated to `text` length 1-300 chars, with server `request.time`).
- Only the corper who owns the pop link can list, read, or delete received messages.

### D. Firebase App Check (Recommended)
For extra anti-abuse protection against bots on high-traffic WhatsApp campaigns, enable **Firebase App Check**:
1. In Firebase Console, go to **App Check**.
2. Register your web app with **reCAPTCHA Enterprise** or **reCAPTCHA v3**.
3. Enforce App Check on Cloud Firestore.

---

## 2. Environment Variables (.env.local)

Create a `.env.local` file in your root folder with the following variables:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID="(default)" # or custom database ID
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

---

## 3. Running the Project

### In Next.js (App Router)
```bash
npm install
npm run dev
```

### In Vite / React Preview
```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to create your 12/12 link!
