// Server-side Firestore access for API routes
// Uses the same Firebase client SDK (works in Next.js server components and API routes)
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDPqnVzbrdcx-ISu0mWcyLNkq5FvbW8sCQ",
  authDomain: "andhraspiceco-afdce.firebaseapp.com",
  projectId: "andhraspiceco-afdce",
  storageBucket: "andhraspiceco-afdce.firebasestorage.app",
  messagingSenderId: "547525201475",
  appId: "1:547525201475:web:c697494f70604a21bd0ef6",
  measurementId: "G-F4RK1VJQKL"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
