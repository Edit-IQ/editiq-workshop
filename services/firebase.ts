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

// Configure auth for better mobile compatibility
auth.useDeviceLanguage();

// Set up auth domain for localhost and mobile environments
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('🔧 Configuring Firebase for localhost...');
} else {
  console.log('🌍 Configuring Firebase for production domain:', window.location.hostname);
}

// Configure Google Auth Provider with mobile-friendly settings
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
  // Better mobile compatibility
  display: 'popup'
});

// Add additional scopes for better compatibility
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Detect mobile/WebView environments
const isMobileOrWebView = () => {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isStandalone = (window.navigator as any).standalone;
  const isWebView = window.matchMedia('(display-mode: standalone)').matches;
  const isWebIntoApp = userAgent.includes('wv') || userAgent.includes('WebView');
  
  return isMobile || isStandalone || isWebView || isWebIntoApp;
};

// Auth functions
export const signInWithGoogle = async () => {
  try {
    console.log('🔐 Starting Firebase Google login...');
    console.log('🌐 Current origin:', window.location.origin);
    console.log('📱 Mobile/WebView detected:', isMobileOrWebView());
    
    // Always try popup first, regardless of environment
    try {
      console.log('🪟 Attempting popup authentication...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Popup login successful:', result.user.email);
      return { user: result.user, error: null };
    } catch (popupError: any) {
      console.warn('⚠️ Popup failed:', popupError.code, popupError.message);
      
      // If popup fails, try redirect (especially good for mobile)
      if (popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cancelled-popup-request' ||
          isMobileOrWebView()) {
        
        console.log('🔄 Using redirect method for mobile/blocked popup...');
        await signInWithRedirect(auth, googleProvider);
        return { user: null, error: null }; // Will be handled by redirect result
      }
      
      // For other popup errors, throw to be handled below
      throw popupError;
    }
  } catch (error: any) {
    console.error('❌ Firebase login error:', error);
    
    // Handle specific mobile/WebView errors
    if (error.message && error.message.includes('sessionStorage')) {
      console.log('🧹 Clearing corrupted session storage...');
      try {
        sessionStorage.clear();
        localStorage.removeItem('firebase:authUser:' + auth.app.options.apiKey + ':[DEFAULT]');
      } catch (clearError) {
        console.warn('⚠️ Could not clear storage:', clearError);
      }
      
      // Try redirect after clearing storage
      try {
        console.log('🔄 Retrying with redirect after storage clear...');
        await signInWithRedirect(auth, googleProvider);
        return { user: null, error: null };
      } catch (redirectError) {
        console.error('❌ Redirect after storage clear failed:', redirectError);
        return { user: null, error: redirectError };
      }
    }
    
    // For network errors, try redirect
    if (error.code === 'auth/network-request-failed' || 
        error.message.includes('CORS') ||
        error.message.includes('network')) {
      
      console.log('🔄 Network error, trying redirect...');
      try {
        await signInWithRedirect(auth, googleProvider);
        return { user: null, error: null };
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
    
    // Handle mobile-specific errors
    if (error.code === 'auth/invalid-api-key' || 
        error.code === 'auth/network-request-failed' ||
        error.message.includes('sessionStorage') ||
        error.message.includes('localStorage')) {
      
      console.log('🧹 Clearing corrupted auth state for mobile...');
      try {
        // Clear all Firebase auth storage
        const apiKey = auth.app.options.apiKey;
        localStorage.removeItem(`firebase:authUser:${apiKey}:[DEFAULT]`);
        localStorage.removeItem(`firebase:host:${apiKey}`);
        sessionStorage.clear();
        
        // Clear any WebView-specific storage
        if ((window as any).webkit && (window as any).webkit.messageHandlers) {
          console.log('📱 WebView detected - clearing WebView storage');
        }
      } catch (clearError) {
        console.warn('⚠️ Could not clear storage:', clearError);
      }
    }
    
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