import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCm6yGRx0cmmV6Bktg9rHYofwSZ6pIf_bY",
  authDomain: "mookup-50b7e.firebaseapp.com",
  projectId: "mookup-50b7e",
  storageBucket: "mookup-50b7e.firebasestorage.app",
  messagingSenderId: "510753388924",
  appId: "1:510753388924:web:0a0755867f92b56e1b4cf9",
  measurementId: "G-LY8QSEB8GW"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with Persistence (Performance 2026 Strategy)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);

// Initialize Analytics conditionally (only in browser)
let analytics;
if (typeof window !== 'undefined') {
  isSupported().then(yes => yes ? (analytics = getAnalytics(app)) : null);
}

export { app, db, auth, analytics };
