import "server-only";
import admin from "firebase-admin";

// Use a singleton pattern with lazy initialization to avoid global side effects during build
// unless strictly necessary. However, for Next.js server actions, top-level init is common
// or init inside the action.
// To handle the "apps already exists" case:

let adminAuth: admin.auth.Auth;

if (admin.apps.length > 0) {
    adminAuth = admin.app().auth();
} else {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // Aggressive cleanup for Private Key
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
        // Remove outer quotes if they were included in the value
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.slice(1, -1);
        }
        // Replace literal \n with actual newlines
        privateKey = privateKey.replace(/\\n/g, "\n");
    }

    if (projectId && clientEmail && privateKey) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
            adminAuth = admin.auth();
        } catch (error) {
            console.error("Firebase Admin Initialization Error:", error);
            // We can't throw here comfortably without crashing the server logic on import
            // But we can assign a proxy or let it fail later.
        }
    } else {
        console.warn("Firebase Admin credentials missing. Auth features will fail.");
    }
}

// @ts-ignore - Handle case where init failed
export { adminAuth };
