/**
 * CorperWe - NYSC 12/12 Anonymous Messages Web App
 */
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, testConnection } from './lib/firebase';
import { CorperDashboard } from './components/CorperDashboard';
import { VisitorPage } from './components/VisitorPage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Simple and resilient client-side routing
  const [currentRoute, setCurrentRoute] = useState<{ path: 'home' | 'pop'; slug?: string }>({
    path: 'home',
  });

  // Test Firestore connection on boot as mandated by the Firebase skill
  useEffect(() => {
    testConnection().catch((err) => {
      console.warn('Initial Firestore connection check notice:', err);
    });
  }, []);

  const [viewLanding, setViewLanding] = useState(false);

  // Parse path or hash route (/pop/[slug] or ?pop=[slug] or #pop/[slug])
  useEffect(() => {
    const parseUrlRoute = () => {
      const pathname = window.location.pathname;
      const search = new URLSearchParams(window.location.search);
      const hash = window.location.hash;

      if (search.get('view') === 'landing' || hash === '#landing') {
        setViewLanding(true);
      } else if (search.get('view') === 'dashboard') {
        setViewLanding(false);
      }

      // Match /pop/:slug
      const popPathMatch = pathname.match(/^\/pop\/([a-zA-Z0-9_-]+)/);
      if (popPathMatch) {
        setCurrentRoute({ path: 'pop', slug: popPathMatch[1] });
        return;
      }

      // Query param fallback ?pop=slug
      if (search.get('pop')) {
        setCurrentRoute({ path: 'pop', slug: search.get('pop')! });
        return;
      }

      // Hash fallback #pop/slug
      const popHashMatch = hash.match(/^#\/?pop\/([a-zA-Z0-9_-]+)/);
      if (popHashMatch) {
        setCurrentRoute({ path: 'pop', slug: popHashMatch[1] });
        return;
      }

      setCurrentRoute({ path: 'home' });
    };

    parseUrlRoute();
    window.addEventListener('popstate', parseUrlRoute);
    window.addEventListener('hashchange', parseUrlRoute);

    return () => {
      window.removeEventListener('popstate', parseUrlRoute);
      window.removeEventListener('hashchange', parseUrlRoute);
    };
  }, []);

  // Track Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Handle Google Sign In
  const handleSignIn = async () => {
    try {
      setSigningIn(true);
      setSignInError(null);
      await signInWithGoogle();
      setViewLanding(false);
    } catch (err: any) {
      console.error('Sign in error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setSignInError('Google sign in was cancelled or failed. Please try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  // Navigation Helpers
  const navigateToVisitor = (slug: string) => {
    setViewLanding(false);
    window.history.pushState({}, '', `/pop/${slug}`);
    setCurrentRoute({ path: 'pop', slug });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToHome = () => {
    setViewLanding(true);
    try {
      window.history.pushState({}, '', '/?view=landing');
    } catch (e) {}
    setCurrentRoute({ path: 'home' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If visiting /pop/[slug], render the visitor submission page
  if (currentRoute.path === 'pop' && currentRoute.slug) {
    return <VisitorPage slug={currentRoute.slug} onNavigateHome={navigateToHome} />;
  }

  // Loading Splash Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#073d27] text-[#f6f1e0] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-[#d9a520] border-t-transparent rounded-full animate-spin mb-4" />
        <h1 className="text-2xl font-black tracking-tight">CorperWe</h1>
        <p className="text-xs text-[#f6f1e0]/70 mt-1">Passing Out Parade • NYSC 12/12</p>
      </div>
    );
  }

  // If user is logged in AND not explicitly viewing the landing page, show Corper Dashboard
  if (currentUser && !viewLanding) {
    return <CorperDashboard user={currentUser} onViewVisitorPage={navigateToVisitor} />;
  }

  // Landing Page for Corpers (Not logged in)
  return (
    <div className="min-h-screen bg-[#073d27] text-white flex flex-col items-center justify-between p-4 sm:p-6 pb-12 selection:bg-[#d9a520] selection:text-[#0b5d3b]">
      {/* Brand Header */}
      <header className="w-full max-w-sm flex items-center justify-between pt-2 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#d9a520] flex items-center justify-center font-black text-[#073d27] text-base shadow-md">
            12
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-[#f6f1e0] block leading-none">
              CorperWe
            </span>
            <span className="text-[10px] text-[#d9a520] font-bold tracking-wider uppercase block mt-0.5">
              NYSC 12/12 POP
            </span>
          </div>
        </div>
        <div className="text-xs bg-black/20 text-[#d9a520] px-2.5 py-1 rounded-full font-bold">
          100% Free
        </div>
      </header>

      {/* Main Hero Card */}
      <main className="w-full max-w-sm flex flex-col items-center my-auto">
        <div className="w-full bg-[#0b5d3b] rounded-3xl p-6 sm:p-7 shadow-2xl border-2 border-[#d9a520]/40 flex flex-col items-center text-center relative overflow-hidden">
          {/* Subtle watermark in background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center"
            style={{
              backgroundImage: `url('/nysc-logo.png')`,
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '80%',
            }}
          />

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-[#d9a520]/20 text-[#d9a520] px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-3">
            12/12 Passing Out Parade
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white leading-tight mb-2">
            Get Anonymous Messages for Your 12/12 POP!
          </h1>

          <p className="text-xs text-[#f6f1e0]/85 leading-relaxed mb-6">
            Create your personal link.
          </p>

          {/* Visual Mini Preview of the Split Card */}
          <div className="w-full max-w-[260px] rounded-2xl overflow-hidden shadow-xl border border-white/20 mb-6 transform -rotate-1 hover:rotate-0 transition-transform">
            <div className="bg-[#d9a520] text-[#073d27] py-3 px-4 flex flex-col items-center">
              <div className="text-3xl font-black leading-none">12/12</div>
              <div className="text-sm font-extrabold">Corper Ada</div>
              <div className="text-[10px] font-bold uppercase tracking-wider bg-white/30 px-2 py-0.5 rounded-full mt-0.5">
                send me anonymous messages!
              </div>
            </div>
            <div className="bg-white text-gray-900 py-3.5 px-4 text-xs font-extrabold text-center">
              "What's your best memory of me?"
            </div>
          </div>

         

          {/* Google Sign In Button */}
          {!currentUser ? (
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-800 font-bold py-3.5 px-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-sm transition-all cursor-pointer border border-gray-200 disabled:opacity-60"
            >
              {signingIn ? (
                <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{signingIn ? 'Signing in with Google...' : 'Sign in with Google'}</span>
            </button>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full bg-black/20 hover:bg-black/40 text-[#f6f1e0] font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer border border-white/10"
            >
              Sign in with a different Google account
            </button>
          )}

          {signInError && (
            <div className="mt-3 text-xs text-red-200 bg-red-950/60 p-2.5 rounded-xl border border-red-500/50">
              {signInError}
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-sm text-center text-[11px] text-[#f6f1e0]/50 pt-4">
        <p>Service and Humility 🇳🇬 • Passing Out Parade</p>
        <p className="mt-0.5">No ads • No payments • Dedicated to all Nigerian Corpers</p>
      </footer>
    </div>
  );
}
