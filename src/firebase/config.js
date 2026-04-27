// config.js

// 1. Fixed: Uncommented the import
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCAzyLlSiDjhJJ_usetALlMQqkRyJdgKQ0",
  authDomain: "progress-tracker-app-7a15b.firebaseapp.com",
  projectId: "progress-tracker-app-7a15b",
  storageBucket: "progress-tracker-app-7a15b.firebasestorage.app",
  messagingSenderId: "289687159320",
  appId: "1:289687159320:web:a890fccebec068d6c8f96d",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// 2. Fixed: Removed the redundant 'export { db }' line at the end.