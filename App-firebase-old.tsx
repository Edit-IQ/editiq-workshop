
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ClientsPage from './components/ClientsPage';
import TransactionsPage from './components/TransactionsPage';
import InsightsPage from './components/InsightsPage';
import CredentialsPage from './components/CredentialsPage';
import WorkspacePage from './components/WorkspacePage';
import { LayoutDashboard, Users, Receipt, BrainCircuit, Shield, LogOut, LogIn, ArrowRight, Briefcase } from 'lucide-react';
import { UserProfile } from './types';

// Simple Firebase initialization without imports
let firebaseAuth: any = null;
let firebaseDb: any = null;

const initializeFirebase = async () => {
  try {
    const { initializeApp } = await import('firebase/app');
    const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = await import('firebase/auth');
    const { getFirestore } = await import('firebase/firestore');

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    const app = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(app);
    firebaseDb = getFirestore(app);

    console.log('✅ Firebase initialized successfully');
    return { auth: firebaseAuth, db: firebaseDb, signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider };
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    return null;
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebase, setFirebase] = useState<any>(null);

  useEffect(() => {
    const setupFirebase = async () => {
      try {
        const fb = await initializeFirebase();
        if (fb) {
          setFirebase(fb);
          
          // Set up auth listener
          const unsubscribe = fb.onAuthStateChanged(fb.auth, (firebaseUser: any) => {
            if (firebaseUser) {
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || 'Creator',
                photoURL: firebaseUser.photoURL || 'https://picsum.photos/100'
              });
            } else {
              setUser(null);
            }
            setLoading(false);
          });

          return unsubscribe;
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Firebase setup failed:', error);
        setLoading(false);
      }
    };

    setupFirebase();
  }, []);

  const handleLogin = async () => {
    if (!firebase) {
      alert('Firebase not initialized. Please refresh the page.');
      return;
    }

    try {
      const provider = new firebase.GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      // Try popup first, fallback to redirect on mobile or if popup fails
      try {
        const result = await firebase.signInWithPopup(firebase.auth, provider);
        console.log("Sign-in successful:", result.user);
      } catch (popupError: any) {
        if (popupError.code === 'auth/unauthorized-domain') {
          // Domain not authorized - show instructions
          alert(`Domain not authorized. Please add ${window.location.hostname} to Firebase Console:\n\n1. Go to Firebase Console\n2. Authentication → Settings → Authorized domains\n3. Add: ${window.location.hostname}`);
          return;
        }
        
        // If popup fails, try redirect (especially for mobile)
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
          const { signInWithRedirect } = await import('firebase/auth');
          await firebase.signInWithRedirect(firebase.auth, provider);
          return;
        }
        
        throw popupError;
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      
      if (error.code === 'auth/unauthorized-domain') {
        alert(`Domain Authorization Required:\n\nPlease add ${window.location.hostname} to Firebase Console:\n\n1. Go to Firebase Console\n2. Authentication → Settings → Authorized domains\n3. Add: ${window.location.hostname}\n\nOr use Demo Mode for now.`);
      } else if (error.code === 'auth/popup-closed-by-user') {
        alert("Sign-in was cancelled. Please try again.");
      } else if (error.code === 'auth/popup-blocked') {
        alert("Popup was blocked by browser. Please allow popups and try again.");
      } else {
        alert(`Authentication failed: ${error.message}\n\nYou can use Demo Mode to continue.`);
      }
    }
  };

  const handleDemoMode = () => {
    setUser({
      uid: 'demo-user-123',
      email: 'demo@editiq.com',
      displayName: 'Demo Editor',
      photoURL: 'https://i.pravatar.cc/150?u=demo'
    });
  };

  const handleLogout = () => {
    if (firebase) {
      firebase.signOut(firebase.auth);
    }
    setUser(null);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020617]">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_20px_#2563eb]"></div>
        <p className="text-blue-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse text-center px-4">
          Initializing Firebase...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 selection:bg-blue-500/30">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[3rem] p-12 text-center shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
          <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white text-4xl font-black mx-auto mb-8 shadow-2xl shadow-blue-900/50 transform group-hover:rotate-6 transition-transform">
            IQ
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">Edit IQ</h1>
          <p className="text-slate-500 text-[10px] mb-12 font-black uppercase tracking-[0.4em]">
            Freelance Finance Hub
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={handleLogin}
              disabled={!firebase}
              className="w-full py-6 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-4 hover:bg-slate-200 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn size={22} /> 
              {firebase ? 'Sign in with Gmail' : 'Loading Firebase...'}
            </button>
            
            <button 
              onClick={handleDemoMode}
              className="w-full py-4 text-slate-400 font-black rounded-2xl flex items-center justify-center gap-2 hover:text-white transition-all text-xs uppercase tracking-widest active:scale-95"
            >
              Enter as Guest <ArrowRight size={14} />
            </button>
          </div>
          
          {/* Domain info for Netlify */}
          {window.location.hostname.includes('netlify') && (
            <div className="mt-6 p-3 bg-amber-900/20 border border-amber-500/20 rounded-lg text-left">
              <p className="text-xs text-amber-400 mb-2">⚠️ Netlify Domain Setup:</p>
              <div className="text-xs text-amber-300 space-y-1">
                <div>Current domain: {window.location.hostname}</div>
                <div>If Gmail sign-in fails, add this domain to Firebase Console</div>
              </div>
            </div>
          )}
          
          <div className="mt-12 flex items-center justify-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              {firebase ? 'Firebase Ready' : 'Loading...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard userId={user.uid} />;
      case 'clients': return <ClientsPage userId={user.uid} />;
      case 'transactions': return <TransactionsPage userId={user.uid} />;
      case 'workspace': return <WorkspacePage userId={user.uid} />;
      case 'insights': return <InsightsPage userId={user.uid} />;
      case 'vault': return <CredentialsPage userId={user.uid} />;
      default: return <Dashboard userId={user.uid} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30 pb-24 md:pb-0 overflow-x-hidden">
      {/* Sidebar (Desktop Only) */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-24 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 flex-col items-center py-10 z-50">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl mb-12 shadow-[0_0_20px_rgba(37,99,235,0.4)]">IQ</div>
        
        <div className="flex-1 flex flex-col gap-6">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Terminal' },
            { id: 'clients', icon: Users, label: 'Portfolios' },
            { id: 'transactions', icon: Receipt, label: 'Ledger' },
            { id: 'workspace', icon: Briefcase, label: 'Workspace' },
            { id: 'insights', icon: BrainCircuit, label: 'Insights' },
            { id: 'vault', icon: Shield, label: 'Vault' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`p-4 rounded-2xl transition-all group relative active:scale-90 ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40 scale-110' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <item.icon size={22} />
              <span className="absolute left-full ml-4 px-3 py-1 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700">
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-auto flex flex-col items-center gap-6">
           <button onClick={handleLogout} className="p-4 text-slate-600 hover:text-rose-500 transition-colors active:scale-90">
              <LogOut size={22} />
           </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation (Native Feel) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-slate-900/80 backdrop-blur-2xl border-t border-slate-800/50 flex items-center justify-around px-2 z-[60] pb-2">
        {[
          { id: 'dashboard', icon: LayoutDashboard },
          { id: 'clients', icon: Users },
          { id: 'transactions', icon: Receipt },
          { id: 'workspace', icon: Briefcase },
          { id: 'insights', icon: BrainCircuit },
          { id: 'vault', icon: Shield },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`p-2 rounded-xl transition-all active:scale-75 flex-1 flex items-center justify-center ${
              activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'
            }`}
          >
            <item.icon size={20} />
          </button>
        ))}
      </nav>

      {/* Main Viewport */}
      <main className="md:pl-24 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          {/* Header Dashboard HUD */}
          <div className="flex items-center justify-between mb-8 md:mb-12 glass-panel p-4 rounded-3xl">
             <div className="flex items-center gap-4 md:gap-6">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700">
                      <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" />
                   </div>
                   <span className="hidden sm:block text-[11px] font-black uppercase tracking-widest text-slate-400">{user.displayName}</span>
                </div>
                <div className="h-4 w-[1px] bg-slate-800"></div>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-blue-500 sync-pulse"></div>
                   <span className="text-[9px] font-black uppercase tracking-widest text-blue-500/80">Active Sync</span>
                </div>
             </div>
             <div className="flex items-center gap-4">
                <button onClick={handleLogout} className="md:hidden text-slate-600 active:scale-90">
                  <LogOut size={20} />
                </button>
                <div className="hidden md:block px-4 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50">
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live Production</span>
                </div>
             </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
