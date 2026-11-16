/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Mail, Lock, Loader2, CheckCircle2, Clock, Edit3, PenTool, Shield, Eye, BookOpen, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from '../components/Logo';
import { useGoogleLogin } from '@react-oauth/google';
import { api } from '../lib/api';

const ROLES = [
  {
    id: 'editor',
    label: 'Editor',
    icon: Edit3,
    color: 'emerald',
    description: 'Full content management access',
    abilities: [
      'Create & publish articles',
      'Manage site design & builder',
      'Access media library',
      'Moderate comments',
    ],
  },
  {
    id: 'author',
    label: 'Author',
    icon: PenTool,
    color: 'sky',
    description: 'Content creation focused',
    abilities: [
      'Write & draft articles',
      'Upload to media library',
      'View own analytics',
      'Comment on posts',
    ],
  },
];

export default function Login() {
  const { user, loading, login, loginWithGoogle, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isSavingRole, setIsSavingRole] = useState(false);

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

  const checkAndShowRolePicker = (_loggedInUser: any) => {
    setShowSuccess(true);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setIsLoggingIn(true);
    try {
      const loggedInUser = await login({ email, password });
      
      const digitalResilience = localStorage.getItem('digitalResilience') !== 'false';
      const isAdmin = loggedInUser?.role === 'admin';
      
      if (!digitalResilience && !isAdmin) {
        logout();
        setError('System is in maintenance mode. Only administrators can log in.');
        setIsLoggingIn(false);
        return;
      }

      checkAndShowRolePicker(loggedInUser);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid email or password. Please try again.');
      setIsLoggingIn(false);
    }
  };

  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      setError('');
      setIsLoggingIn(true);
      try {
        const loggedInUser = await loginWithGoogle(codeResponse.code);
        
        const digitalResilience = localStorage.getItem('digitalResilience') !== 'false';
      const isAdmin = loggedInUser?.role === 'admin';
        
        if (!digitalResilience && !isAdmin) {
          logout();
          setError('System is in maintenance mode. Only administrators can log in.');
          setIsLoggingIn(false);
          return;
        }

        checkAndShowRolePicker(loggedInUser);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Google authentication failed.');
        setIsLoggingIn(false);
      }
    },
    onError: errorResponse => {
      console.error(errorResponse);
      setError('Google authentication was cancelled or failed.');
    },
  });

  const handleRoleSelect = async (role: string) => {
    if (!pendingUser) return;
    setSelectedRole(role);
    setIsSavingRole(true);
    try {
      const userId = pendingUser._id || pendingUser.id;
      await api.users.update(userId, { role });
      await refreshProfile();
    } catch (err) {
      console.error('Failed to save role:', err);
    } finally {
      setIsSavingRole(false);
      setShowRolePicker(false);
      setShowSuccess(true);
    }
  };

  if (loading) return null;
  if (user && !showSuccess && !showRolePicker) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 flex items-center justify-center p-6 selection:bg-emerald-100 dark:selection:bg-emerald-900 selection:text-emerald-900 dark:selection:text-emerald-100 transition-colors duration-300">
      <AnimatePresence mode="wait">
        {showRolePicker ? (
          <motion.div
            key="role-picker"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl shadow-xl shadow-stone-200/50 dark:shadow-none p-8 border border-stone-100 dark:border-stone-800 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-sky-500"></div>
            
            <div className="flex flex-col items-center mb-8">
              <Link to="/" className="mb-5 hover:scale-105 transition-transform">
                <Logo size={56} />
              </Link>
              <h1 className="text-2xl font-serif font-black text-stone-900 dark:text-white mb-1 tracking-tighter text-center">Choose Your Role</h1>
              <p className="text-stone-400 dark:text-stone-500 text-center text-[10px] uppercase tracking-[0.4em] font-black leading-none">Define Your Access & Authority</p>
            </div>

            <p className="text-sm text-stone-500 dark:text-stone-400 text-center mb-6 leading-relaxed">
              Select the role that best describes how you'll use the workspace. This shapes your access and what you can do.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  disabled={isSavingRole}
                  className={`group relative flex flex-col p-6 rounded-2xl border-2 text-left transition-all active:scale-[0.98] disabled:opacity-60 ${
                    selectedRole === role.id
                      ? role.color === 'emerald'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                        : 'border-sky-500 bg-sky-50 dark:bg-sky-950/20'
                      : 'border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500 bg-white dark:bg-stone-800/50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    role.color === 'emerald' 
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
                  }`}>
                    {isSavingRole && selectedRole === role.id ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <role.icon size={20} />
                    )}
                  </div>
                  <h3 className="text-base font-black text-stone-900 dark:text-white mb-1">{role.label}</h3>
                  <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3">{role.description}</p>
                  <ul className="space-y-1.5">
                    {role.abilities.map((ability, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-stone-600 dark:text-stone-400">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                          role.color === 'emerald' ? 'bg-emerald-500' : 'bg-sky-500'
                        }`}></span>
                        {ability}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <p className="text-center text-[10px] text-stone-400 dark:text-stone-600 leading-relaxed">
              You can always update your role later in Settings.
            </p>
          </motion.div>
        ) : !showSuccess ? (
          <motion.div 
            key="login-form"
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
              <p className="text-stone-400 dark:text-stone-500 text-center text-[10px] uppercase tracking-[0.4em] font-black leading-none">Authentication Nexus</p>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-6">
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
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300 ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-600 group-focus-within:text-emerald-500 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="artist@sitesculpt.art"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 dark:focus:ring-emerald-500/10 outline-none transition-all placeholder:text-stone-300 dark:placeholder:text-stone-700"
                    disabled={isLoggingIn}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Password</label>
                  <button type="button" className="text-xs text-stone-400 dark:text-stone-600 hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors">Forgot?</button>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-600 group-focus-within:text-emerald-500 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 dark:focus:ring-emerald-500/10 outline-none transition-all placeholder:text-stone-300 dark:placeholder:text-stone-700"
                    disabled={isLoggingIn}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-3 bg-stone-900 dark:bg-emerald-600 hover:bg-stone-800 dark:hover:bg-emerald-500 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-white font-medium py-3.5 rounded-2xl transition-all shadow-lg hover:shadow-xl shadow-stone-900/10 active:scale-[0.98] mt-2"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-100 dark:border-stone-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-stone-900 px-4 text-stone-400 dark:text-stone-600 font-medium tracking-widest">Or continue with</span>
              </div>
            </div>

            <button
              onClick={() => googleLogin()}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 font-medium py-3 rounded-2xl transition-all shadow-sm active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Google Workspace
            </button>

            <div className="mt-8 text-center text-sm text-stone-500 dark:text-stone-400">
              New to Page Pilot?{' '}
              <Link to="/signup" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                Create Account
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
            <h2 className="text-3xl font-serif font-bold text-stone-900 dark:text-white mb-2">Welcome!</h2>
            <p className="text-stone-500 dark:text-stone-400 mb-8">Opening your creative suite. This will only take a moment.</p>
            
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
              Redrawing interface in {countdown}s...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
