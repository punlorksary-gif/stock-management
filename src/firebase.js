import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDGVeI8p4D3YF5UsJBPsSkmTSlt25KOMgs",
    authDomain: "stock-management-eae2b.firebaseapp.com",
    projectId: "stock-management-eae2b",
    storageBucket: "stock-management-eae2b.firebasestorage.app",
    messagingSenderId: "155573704727",
    appId: "1:155573704727:web:88842103e4f594e995a452",
    measurementId: "G-4KNYLFZ1Y5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
