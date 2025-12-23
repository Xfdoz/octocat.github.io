import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAhvxeoum5Sy9RQMWT_49K2EY4pld1R83c",
  authDomain: "surveillance-ad075.firebaseapp.com", // CORRIGÉ ICI
  projectId: "surveillance-ad075",
  storageBucket: "surveillance-ad075.firebasestorage.app",
  messagingSenderId: "666577257762",
  appId: "1:666577257762:web:e8124f32f86f7a492c517b"
};

// Initialisation
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);