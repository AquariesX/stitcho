import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCIDnYxSPxdyf8ydLi88JcAXSLTPZYvB7I",
  authDomain: "stitcho-70565.firebaseapp.com",
  projectId: "stitcho-70565",
  storageBucket: "stitcho-70565.firebasestorage.app",
  messagingSenderId: "841052325452",
  appId: "1:841052325452:web:bb5e00bc6e8783c16f96e9",
  measurementId: "G-J2ESM2Z0QP"
};

// Initialize Firebase
// Use existing app if already initialized (singleton)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const storage = getStorage(app);

export { app, auth, storage };
