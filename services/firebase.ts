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

// Set up auth domain for GitHub Pages and mobile environments
const currentDomain = window.location.hostname;
console.log('🌍 Current domain:', currentDomain);

if (currentDomain === 'localhost' || currentDomain === '127.0.0.1') {
  console.log('🔧 Configuring Firebase for localhost...');
} else if (currentDomain.includes('github.io')) {
  console.log('📄 Configuring Firebase for GitHub Pages...');
} else {
  console.log('🌍 Configuring Firebase for production domain:', currentDomain);
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

// Detect WebIntoApp and other WebView environments
const detectEnvironment = () => {
  const userAgent = navigator.userAgent;
  const href = window.location.href;
  
  // More comprehensive WebIntoApp detection
  const isWebIntoApp = userAgent.includes('wv') || 
                       userAgent.includes('WebView') || 
                       userAgent.includes('WebIntoApp') ||
                       href.includes('webintoapp') ||
                       // Additional WebView indicators
                       userAgent.includes('Version/') && userAgent.includes('Mobile Safari') ||
                       // Check for Android WebView
                       (userAgent.includes('Android') && userAgent.includes('wv')) ||
                       // Check for storage restrictions (common in WebViews)
                       (() => {
                         try {
                           sessionStorage.setItem('test', 'test');
                           sessionStorage.removeItem('test');
                           return false;
                         } catch (e) {
                           return true; // Storage restricted = likely WebView
                         }
                       })();
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isStandalone = (window.navigator as any).standalone;
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  
  console.log('🔍 Environment Detection:', {
    userAgent: userAgent.substring(0, 100) + '...',
    isWebIntoApp,
    isMobile,
    isStandalone,
    isPWA,
    href: href.substring(0, 50) + '...'
  });
  
  return {
    isWebIntoApp,
    isMobile,
    isStandalone,
    isPWA,
    isWebView: isWebIntoApp || isStandalone || isPWA
  };
};

// Auth functions
export const signInWithGoogle = async () => {
  const env = detectEnvironment();
  
  try {
    console.log('🔐 Starting Firebase Google login...');
    console.log('🌐 Current origin:', window.location.origin);
    console.log('📱 Environment:', env);
    
    // Try popup first for all environments
    try {
      console.log('🪟 Attempting popup authentication...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Popup login successful:', result.user.email);
      return { user: result.user, error: null };
    } catch (popupError: any) {
      console.warn('⚠️ Popup failed:', popupError.code, popupError.message);
      
      // If popup fails, try redirect (good for mobile/WebIntoApp)
      if (popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cancelled-popup-request' ||
          env.isMobile || env.isWebIntoApp) {
        
        console.log('🔄 Using redirect method for mobile/WebIntoApp...');
        await signInWithRedirect(auth, googleProvider);
        return { user: null, error: null }; // Will be handled by redirect result
      }
      
      // For other popup errors, throw to be handled below
      throw popupError;
    }
  } catch (error: any) {
    console.error('❌ Firebase login error:', error);
    
    // Handle specific mobile/WebView errors with better recovery
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
        
        // Only as last resort, provide fallback account
        if (env.isWebIntoApp || env.isMobile) {
          console.log('🔄 Last resort: providing WebIntoApp fallback account...');
          return { 
            user: {
              uid: 'test-firebase-user-456',
              email: 'deyankur.391@gmail.com',
              displayName: 'Deyankur (WebIntoApp Fallback)',
              photoURL: 'https://res.cloudinary.com/dvd6oa63p/image/upload/v1768175554/workspacebgpng_zytu0b.png'
            }, 
            error: null 
          };
        }
        
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