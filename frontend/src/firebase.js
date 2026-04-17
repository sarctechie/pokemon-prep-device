import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "ENTER YOUR API KEY",
  authDomain: "ENTER YOUR AUTH DOMAIN",
  projectId: "PROJECT ID",
  storageBucket: "YOU GET IT",
  messagingSenderId: "GOODBOY",
  appId: "IDK WHAT TO SAY",
  measurementId: "SUP?"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

await setPersistence(auth, browserLocalPersistence);
