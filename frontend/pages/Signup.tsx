/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Mail, Lock, User, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from '../components/Logo';
import { useGoogleLogin } from '@react-oauth/google';

export default function Signup() {
  const { user, loading, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showSuccess && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (showSuccess && countdown === 0) {
      navigate('/dashboard');
    }
    return () => clearInterval(timer);
  }, [showSuccess, countdown, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setError('Please fill in all fields');
      return;
    }
    
    setError('');
    setIsSigningUp(true);
    
    try {
      await register({ email, password, displayName: fullName });
      
      setShowSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create account. Please try again.');
      setIsSigningUp(false);
    }
  };

  const googleSignup = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      setError('');
      setIsSigningUp(true);
      try {
        await loginWithGoogle(codeResponse.code);
        setShowSuccess(true);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Google authentication failed.');
        setIsSigningUp(false);
      }
    },
    onError: () => {
      setError('Google authentication was cancelled or failed.');
    },
  });

  const handleGoogleSignup = () => {
    googleSignup();
  };

  if (loading) return null;
  if (user && !showSuccess) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 flex items-center justify-center p-6 selection:bg-emerald-100 dark:selection:bg-emerald-900 selection:text-emerald-900 dark:selection:text-emerald-100 transition-colors duration-300">
      <AnimatePresence mode="wait">
        {!showSuccess ? (
          <motion.div 
            key="signup-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-xl shadow-stone-200/50 dark:shadow-none p-8 border border-stone-100 dark:border-stone-800 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-cyan-500"></div>
            
            <div className="flex flex-col items-center mb-10">
              <Link to="/" className="mb-6 hover:scale-105 transition-transform">
                <Logo size={72} />
              </Link>
              <h1 className="text-3xl font-serif font-black text-stone-900 dark:text-white mb-2 tracking-tighter text-center">Page Pilot CMS</h1>
              <p className="text-stone-400 dark:text-stone-500 text-center text-[10px] uppercase tracking-[0.4em] font-black leading-none">Artisan Membership</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30 italic flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                  {error}
                </motion.div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300 ml-1">Full Name</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-600 group-focus-within:text-emerald-500 transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Leonardo da Vinci"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 dark:focus:ring-emerald-500/10 outline-none transition-all placeholder:text-stone-300 dark:placeholder:text-stone-700"
                    disabled={isSigningUp}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300 ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-600 group-focus-within:text-emerald-500 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="leo@sitesculpt.art"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 dark:focus:ring-emerald-500/10 outline-none transition-all placeholder:text-stone-300 dark:placeholder:text-stone-700"
                    disabled={isSigningUp}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300 ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-600 group-focus-within:text-emerald-500 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    minLength={12}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 dark:focus:ring-emerald-500/10 outline-none transition-all placeholder:text-stone-300 dark:placeholder:text-stone-700"
                    disabled={isSigningUp}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSigningUp}
                className="w-full flex items-center justify-center gap-3 bg-stone-900 dark:bg-emerald-600 hover:bg-stone-800 dark:hover:bg-emerald-500 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-white font-medium py-3.5 rounded-2xl transition-all shadow-lg hover:shadow-xl shadow-stone-900/10 active:scale-[0.98] mt-4"
              >
                {isSigningUp ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Sculpting account...
                  </>
                ) : (
                  <>
                    <UserPlus size={20} />
                    Create Account
                  </>
                )}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-100 dark:border-stone-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-stone-900 px-4 text-stone-400 dark:text-stone-600 font-medium tracking-widest">Or join with</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignup}
              disabled={isSigningUp}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 font-medium py-3 rounded-2xl transition-all shadow-sm active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Google Identity
            </button>

            <div className="mt-8 text-center text-sm text-stone-500 dark:text-stone-400">
              Already have a key?{' '}
              <Link to="/login" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                Sign In
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="success-delay"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-xl p-12 border border-stone-100 dark:border-stone-800 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 mx-auto mb-6">
              <CheckCircle2 size={48} className="animate-bounce" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-stone-900 dark:text-white mb-2">Welcome Aboard!</h2>
            <p className="text-stone-500 dark:text-stone-400 mb-8">Your workspace is being prepared to perfection.</p>
            
            <div className="relative w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden mb-4">
              <motion.div 
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 5, ease: "linear" }}
                className="absolute top-0 left-0 h-full bg-emerald-500 dark:bg-emerald-600"
              />
            </div>
            
            <div className="flex items-center justify-center gap-2 text-stone-400 dark:text-stone-600 font-mono text-sm">
              <Clock size={16} />
              Entering dashboard in {countdown}s...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
