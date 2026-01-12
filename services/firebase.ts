import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCVETgTKYN4FY3OxV81wERGjbvPFsK_Cz0",
  authDomain: "spontaneous-pixie-1a76e9.firebaseapp.com",
  projectId: "spontaneous-pixie-1a76e9",
  storageBucket: "spontaneous-pixie-1a76e9.firebasestorage.app",
  messagingSenderId: "911257745432",
  appId: "1:911257745432:web:798307aed3780458996b6d",
  measurementId: "G-RDNBMGDZ76"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Auth functions
export const signInWithGoogle = async () => {
  try {
    console.log('Starting Firebase Google login...');
    const result = await signInWithPopup(auth, googleProvider);
    console.log('✅ Firebase login successful:', result.user.email);
    return { user: result.user, error: null };
  } catch (error: any) {
    console.error('Firebase login error:', error);
    return { user: null, error };
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    console.log('✅ User signed out');
    return { error: null };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return { error };
  }
};

export const onAuthStateChange = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};

export { app };