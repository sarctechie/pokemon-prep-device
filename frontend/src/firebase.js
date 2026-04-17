import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDSbM8B7ts6z2-BL4kgMbCBB7OH0tEAalA",
  authDomain: "draft-tracker-c0078.firebaseapp.com",
  projectId: "draft-tracker-c0078",
  storageBucket: "draft-tracker-c0078.firebasestorage.app",
  messagingSenderId: "1061965437180",
  appId: "1:1061965437180:web:88fdb00c24f51d12f5df79",
  measurementId: "G-9WQ2WMPP8Y"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

await setPersistence(auth, browserLocalPersistence);
