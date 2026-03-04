import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDPP4dND0yjk9_X5-hJVaw5mqU4yejCuJg",
  authDomain: "semtrek-485b7.firebaseapp.com",
  projectId: "semtrek-485b7",
  storageBucket: "semtrek-485b7.firebasestorage.app",
  messagingSenderId: "803400272414",
  appId: "1:803400272414:web:896e1478151eddec3dbc0f",
  measurementId: "G-V61ZDW656S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();