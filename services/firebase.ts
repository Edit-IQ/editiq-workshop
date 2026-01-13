import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCVETgTKYN4FY3OxV81wERGjbvPFsK_Cz0",
  authDomain: "spontaneous-pixie-1a76e9.firebaseapp.com",
  projectId: "spontaneous-pixie-1a76e9",
  storageBucket: "spontaneous-pixie-1a76e9.firebasestorage.app",
  messagingSenderId: "911257745432",
  appId: "1:911257745432:web:798307aed3780458996b6d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure auth for better compatibility
auth.useDeviceLanguage();

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Add scopes
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Auth functions
export const signInWithGoogle = async () => {
  try {
    console.log('🔐 Starting Google sign-in...');
    
    // Try popup authentication
    const result = await signInWithPopup(auth, googleProvider);
    console.log('✅ Login successful:', result.user.email);
    return { user: result.user, error: null };
    
  } catch (error: any) {
    console.error('❌ Login error:', error);
    
    // If popup fails, try redirect as fallback
    if (error.code === 'auth/popup-blocked' || 
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request') {
      
      console.log('🔄 Popup blocked, using redirect...');
      try {
        await signInWithRedirect(auth, googleProvider);
        return { user: null, error: null }; // Will be handled by redirect result
      } catch (redirectError) {
        console.error('❌ Redirect also failed:', redirectError);
        return { user: null, error: redirectError };
      }
    }
    
    return { user: null, error };
  }
};

// Check for redirect result on app load
export const checkRedirectResult = async () => {
  try {
    console.log('🔍 Checking for redirect result...');
    const result = await getRedirectResult(auth);
    if (result) {
      console.log('✅ Redirect login successful:', result.user.email);
      return { user: result.user, error: null };
    }
    console.log('ℹ️ No redirect result found');
    return { user: null, error: null };
  } catch (error: any) {
    console.error('❌ Redirect result error:', error);
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
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('✅ Auth state change - User:', user.email, 'UID:', user.uid);
      console.log('🔍 Full user object:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        providerId: user.providerData[0]?.providerId,
        providerUid: user.providerData[0]?.uid
      });
    } else {
      console.log('🚪 Auth state change - No user');
    }
    callback(user);
  });
};

export { app };