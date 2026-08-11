import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } from '../lib/firebase';

// Simple logo mark reused from the main app so the auth screen matches the brand.
const TechApexIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 20H22L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M12 2V20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.8 4.1-17.1 10.1z"/>
    <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6c-2.1 1.5-4.9 2.4-7.7 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.9 39.5 16.4 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.6 5.6C39.3 37.4 44 31.4 44 24c0-1.3-.1-2.7-.4-3.5z"/>
  </svg>
);

type Mode = 'signin' | 'signup' | 'reset';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const friendlyError = (code: string): string => {
    switch (code) {
      case 'auth/invalid-email': return 'That email address looks invalid.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential': return 'Incorrect email or password.';
      case 'auth/email-already-in-use': return 'An account with that email already exists.';
      case 'auth/weak-password': return 'Password should be at least 6 characters.';
      case 'auth/popup-closed-by-user': return 'Google sign-in was cancelled.';
      case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment and try again.';
      default: return 'Something went wrong. Please try again.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else if (mode === 'signup') {
        if (password.length < 6) {
          setError('Password should be at least 6 characters.');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, name.trim() || undefined);
      } else if (mode === 'reset') {
        await resetPassword(email);
        setInfo('Password reset email sent. Check your inbox.');
      }
    } catch (err: any) {
      setError(friendlyError(err?.code || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setInfo(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(friendlyError(err?.code || ''));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient glow to match the app's aesthetic */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-40">
        <div className="w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-10">
          <TechApexIcon className="text-zinc-100 w-8 h-8 mb-3" />
          <h1 className="text-2xl font-bold tracking-tight">ARX</h1>
          <p className="text-zinc-500 text-sm mt-2">
            {mode === 'signup' ? 'Create an account to get started' : mode === 'reset' ? 'Reset your password' : 'Sign in to continue'}
          </p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm overflow-hidden"
              >
                {error}
              </motion.div>
            )}
            {info && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm overflow-hidden"
              >
                {info}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            type="button"
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-xl font-medium text-sm transition-all disabled:opacity-60"
          >
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon className="w-4 h-4" />}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-600">or</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                autoComplete="name"
                className="w-full p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-zinc-500 outline-none transition-all placeholder:text-zinc-700 text-sm"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              required
              className="w-full p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-zinc-500 outline-none transition-all placeholder:text-zinc-700 text-sm"
            />
            {mode !== 'reset' && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={6}
                className="w-full p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-zinc-500 outline-none transition-all placeholder:text-zinc-700 text-sm"
              />
            )}

            {mode === 'signin' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(null); setInfo(null); }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-transparent border border-zinc-700 hover:border-zinc-500 rounded-xl font-medium uppercase tracking-[0.2em] text-xs transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signup' ? 'Create Account' : mode === 'reset' ? 'Send Reset Link' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-sm text-zinc-500">
          {mode === 'signin' && (
            <>Don't have an account?{' '}
              <button onClick={() => { setMode('signup'); setError(null); setInfo(null); }} className="text-zinc-200 hover:underline">Sign up</button>
            </>
          )}
          {mode === 'signup' && (
            <>Already have an account?{' '}
              <button onClick={() => { setMode('signin'); setError(null); setInfo(null); }} className="text-zinc-200 hover:underline">Sign in</button>
            </>
          )}
          {mode === 'reset' && (
            <button onClick={() => { setMode('signin'); setError(null); setInfo(null); }} className="text-zinc-200 hover:underline">Back to sign in</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
