# CorperWe

Anonymous 12/12 message pages for Nigerian NYSC corps members. Built with React, Vite, Tailwind and Firebase (Auth + Firestore).

## Run locally

1. `npm install`
2. Put your own Firebase web config in `firebase-applet-config.json` and set `"firestoreDatabaseId": "(default)"`.
3. In Firebase: enable Google sign-in, create a Firestore database, and publish `firestore.rules`.
4. `npm run dev`

No API keys other than the Firebase web config are needed. Not affiliated with NYSC.
