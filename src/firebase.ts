// firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC0A0s9T9Tm741IAufgTJoYqKUbRRV7MK8",
  authDomain: "manhole-card-app.firebaseapp.com",
  projectId: "manhole-card-app",
  storageBucket: "manhole-card-app.appspot.com",  // ←ここ .com が正しい
  messagingSenderId: "1095908571019",
  appId: "1:1095908571019:web:fa01763f39c35611d5618e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);