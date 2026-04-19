import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBTcZ2FUbQSErIZ_uOY9Ctt04WCTi3Pnlk",
  authDomain: "pgcla1.firebaseapp.com",
  projectId: "pgcla1",
  storageBucket: "pgcla1.firebasestorage.app",
  messagingSenderId: "1018248854390",
  appId: "1:1018248854390:web:fd926bd362a9f546565857",
  measurementId: "G-K8DX6S7YJT",
  databaseURL: "https://pgcla1-default-rtdb.asia-southeast1.firebasedatabase.app" // Adding manually since RTDB usually requires this
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
