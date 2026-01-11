/**
 * Firebase Configuration for RestoInsight Frontend
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAdZ8gIetGc_dZ2IPl-EqXIVduHdVEubZA",
  authDomain: "restoinsight.firebaseapp.com",
  projectId: "restoinsight",
  storageBucket: "restoinsight.firebasestorage.app",
  messagingSenderId: "931559261868",
  appId: "1:931559261868:web:63746ac228c7a43e8b0109"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
