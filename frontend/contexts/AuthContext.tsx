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
    let active = true;
    api.auth.me()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setProfile(currentUser);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setProfile(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const login = async (data: any) => {
    const currentUser = await api.auth.login(data);
    setUser(currentUser);
    setProfile(currentUser);
    return currentUser;
  };

  const register = async (data: any) => {
    const currentUser = await api.auth.register(data);
    setUser(currentUser);
    setProfile(currentUser);
    return currentUser;
  };

  const guestLogin = async () => {
    // Guest login removed — users must sign in with a real account
  };

  const loginWithGoogle = async (authCode: string) => {
    const currentUser = await api.auth.loginWithGoogle(authCode);
    setUser(currentUser);
    setProfile(currentUser);
    return currentUser;
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setProfile(null);
    }
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
