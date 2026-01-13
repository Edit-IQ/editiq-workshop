import React, { useState, useEffect } from 'react'
import { signInWithGoogle, signOut, onAuthStateChange, checkRedirectResult } from './services/firebase'
import Dashboard from './components/Dashboard'
import ClientsPage from './components/ClientsPage'
import TransactionsPage from './components/TransactionsPage'
import InsightsPage from './components/InsightsPage'
import CredentialsPage from './components/CredentialsPage'
import WorkspacePage from './components/WorkspacePage'
import { LayoutDashboard, Users, Receipt, BrainCircuit, Shield, LogOut, LogIn, ArrowRight, Briefcase } from 'lucide-react'
import { UserProfile } from './types'

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true;
    
    // Check for redirect result first
    const handleRedirectResult = async () => {
      const { user: redirectUser } = await checkRedirectResult();
      if (redirectUser && mounted) {
        console.log('✅ Redirect authentication successful:', redirectUser.email);
        setUser({
          uid: redirectUser.uid,
          email: redirectUser.email || '',
          displayName: redirectUser.displayName || 'User',
          photoURL: redirectUser.photoURL || 'https://i.pravatar.cc/150'
        });
        setLoading(false);
        return;
      }
      
      // Set up Firebase auth state listener
      const unsubscribe = onAuthStateChange((user) => {
        if (!mounted) return;
        
        if (user) {
          console.log('✅ Firebase user authenticated:', user.email);
          setUser({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'User',
            photoURL: user.photoURL || 'https://i.pravatar.cc/150'
          });
        } else {
          console.log('🚪 No Firebase user');
          setUser(null);
        }
        
        setLoading(false);
      });

      // Cleanup
      return () => {
        mounted = false;
        unsubscribe();
      };
    };
    
    handleRedirectResult();
  }, [])

  const handleLogin = async () => {
    try {
      console.log('🔐 Starting Firebase Google login...')
      setLoading(true)
      
      // Check if we're on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        console.log('📱 Mobile device detected - using optimized flow');
        // Clear any existing auth state first on mobile
        try {
          localStorage.removeItem('firebase:authUser:' + 'AIzaSyBvQZjGhLnTormNwOvy' + ':[DEFAULT]');
          sessionStorage.clear();
        } catch (clearError) {
          console.warn('Could not clear storage:', clearError);
        }
      }
      
      const { user, error } = await signInWithGoogle()
      
      if (error) {
        console.error('❌ Firebase login error:', error)
        
        // Provide helpful error messages
        let errorMessage = 'Login failed. ';
        if (error.code === 'auth/popup-blocked') {
          errorMessage += 'Popup was blocked. Please allow popups for this site and try again.';
        } else if (error.code === 'auth/network-request-failed') {
          errorMessage += 'Network error. Please check your internet connection.';
        } else if (error.message?.includes('CORS') || error.message?.includes('sessionStorage')) {
          errorMessage += 'Browser compatibility issue. Try using "Enter as Guest" instead.';
        } else {
          errorMessage += error.message || 'Please try again or use "Enter as Guest".';
        }
        
        alert(errorMessage)
        setLoading(false)
        return
      }
      
      if (user) {
        console.log('✅ Firebase login successful:', user.email)
        // User state will be updated by the auth state listener
      }
      
    } catch (error) {
      console.error('❌ Login error:', error)
      alert('Login failed. Please try again or use "Enter as Guest".')
      setLoading(false)
    }
  }

  const handleDemoMode = () => {
    console.log('🎭 Entering demo mode...')
    setUser({
      uid: 'demo-user-123',
      email: 'demo@editiq.com',
      displayName: 'Demo User',
      photoURL: 'https://i.pravatar.cc/150?u=demo'
    })
    setLoading(false)
  }

  const handleTestYourAccount = () => {
    console.log('🧪 Creating test user for your account...')
    // Create a test user that uses your specific data
    setUser({
      uid: 'test-firebase-user-456', // This will map to your old data
      email: 'deyankur.391@gmail.com', // Your real Firebase email
      displayName: 'Deyankur',
      photoURL: 'https://lh3.googleusercontent.com/a/ACg8ocLQ9jmOkvNTf3WZBxA878NKYExP2FzJe0dB6RrbqTAw6hW-foU=s96-c'
    })
    setLoading(false)
  }

  const handleLogout = async () => {
    await signOut()
    setUser(null)
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020617]">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_20px_#2563eb]"></div>
        <p className="text-blue-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse text-center px-4 mb-8">
          Connecting to Firebase...
        </p>
        <button 
          onClick={() => {
            setUser({
              uid: 'demo-user-123',
              email: 'demo@editiq.com',
              displayName: 'Demo User',
              photoURL: 'https://i.pravatar.cc/150?u=demo'
            });
            setLoading(false);
          }}
          className="px-6 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors border border-slate-600"
        >
          Skip & Enter Demo Mode
        </button>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 selection:bg-blue-500/30">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[3rem] p-12 text-center shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
          <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white text-4xl font-black mx-auto mb-8 shadow-2xl shadow-blue-900/50 transform group-hover:rotate-6 transition-transform overflow-hidden">
            <img 
              src="https://res.cloudinary.com/dvd6oa63p/image/upload/v1768175554/workspacebgpng_zytu0b.png" 
              alt="Edit IQ Logo" 
              className="w-full h-full object-cover rounded-[2rem]"
            />
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">Edit IQ</h1>
          <p className="text-slate-500 text-[10px] mb-12 font-black uppercase tracking-[0.4em]">
            Freelance Finance Hub
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={handleLogin}
              className="w-full py-6 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-4 hover:bg-slate-200 transition-all shadow-xl active:scale-95"
            >
              <LogIn size={22} /> 
              Sign in with Google
            </button>
            
            <button 
              onClick={handleDemoMode}
              className="w-full py-4 text-slate-400 font-black rounded-2xl flex items-center justify-center gap-2 hover:text-white transition-all text-xs uppercase tracking-widest active:scale-95"
            >
              Enter as Guest <ArrowRight size={14} />
            </button>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Firebase Ready
            </span>
          </div>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard userId={user.uid} />
      case 'clients': return <ClientsPage userId={user.uid} />
      case 'transactions': return <TransactionsPage userId={user.uid} />
      case 'workspace': return <WorkspacePage userId={user.uid} />
      case 'insights': return <InsightsPage userId={user.uid} />
      case 'vault': return <CredentialsPage userId={user.uid} />
      default: return <Dashboard userId={user.uid} />
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30 pb-24 md:pb-0 overflow-x-hidden">
      {/* Sidebar (Desktop Only) */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-24 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 flex-col items-center py-10 z-50">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl mb-12 shadow-[0_0_20px_rgba(37,99,235,0.4)] overflow-hidden">
          <img 
            src="https://res.cloudinary.com/dvd6oa63p/image/upload/v1768175554/workspacebgpng_zytu0b.png" 
            alt="Edit IQ Logo" 
            className="w-full h-full object-cover rounded-2xl"
          />
        </div>
        
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

      {/* Mobile Bottom Navigation */}
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

      {/* Main Content */}
      <main className="md:pl-24 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          {/* Header */}
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
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                   <span className="text-[9px] font-black uppercase tracking-widest text-green-500/80">Firebase Ready</span>
                </div>
             </div>
             <div className="flex items-center gap-4">
                <button onClick={handleLogout} className="md:hidden text-slate-600 active:scale-90">
                  <LogOut size={20} />
                </button>
                <div className="hidden md:block px-4 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50">
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Production Ready</span>
                </div>
             </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  )
}

const App: React.FC = () => {
  return <AppContent />;
}

export default App