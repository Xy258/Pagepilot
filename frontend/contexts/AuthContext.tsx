/**
 * Authentication Context
 * Manages user session state using Local Mock Auth instead of Firebase.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

interface AuthContextType {
  user: any | null;      // Logged in user info
  profile: any | null;   // User profile
  loading: boolean;      // Initial auth check state
  login: (data: any) => Promise<any>;
  register: (data: any) => Promise<any>;
  logout: () => Promise<void>;
  loginWithGoogle: (authCode: string, role?: string) => Promise<any>;
  guestLogin: () => Promise<void>;
  refreshProfile: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (user?.uid) {
      const data = await api.auth.me();
      setProfile(data);
      return data;
    }
    return null;
  };

  useEffect(() => {
    // Simulate auth state load
    const loadAuth = async () => {
      setLoading(true);
      const isLoggedOut = localStorage.getItem('mock_logged_out');
      if (isLoggedOut === 'true') {
        setUser(null);
        setProfile(null);
      } else {
        const currentUser = await api.auth.me();
        if (currentUser?.uid) localStorage.setItem('artisan_user_id', currentUser.uid);
        setUser(currentUser);
        setProfile(currentUser);
      }
      setLoading(false);
    };
    loadAuth();
  }, []);

  const storeUid = (u: any) => {
    if (u?.uid) localStorage.setItem('artisan_user_id', u.uid);
  };

  const login = async (data: any) => {
    localStorage.removeItem('mock_logged_out');
    const currentUser = await api.auth.login(data);
    storeUid(currentUser);
    setUser(currentUser);
    setProfile(currentUser);
    return currentUser;
  };

  const register = async (data: any) => {
    localStorage.removeItem('mock_logged_out');
    const currentUser = await api.auth.login(data);
    storeUid(currentUser);
    setUser(currentUser);
    setProfile(currentUser);
    return currentUser;
  };

  const guestLogin = async () => {
    localStorage.removeItem('mock_logged_out');
    const currentUser = await api.auth.me();
    storeUid(currentUser);
    setUser(currentUser);
    setProfile(currentUser);
    return currentUser;
  };

  const loginWithGoogle = async (authCode: string, role?: string) => {
    localStorage.removeItem('mock_logged_out');
    const currentUser = await api.auth.loginWithGoogle(authCode, role);
    storeUid(currentUser);
    setUser(currentUser);
    setProfile(currentUser);
    return currentUser;
  };

  const logout = async () => {
    localStorage.setItem('mock_logged_out', 'true');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      login, 
      register, 
      logout,
      loginWithGoogle,
      guestLogin,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
