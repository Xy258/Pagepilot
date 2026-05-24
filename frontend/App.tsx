/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';
import ContentEditor from './pages/ContentEditor';
import Ecommerce from './pages/Ecommerce';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Plugins from './pages/Plugins';
import PluginApp from './pages/PluginApp';
import Users from './pages/Users';
import SiteBuilder from './pages/SiteBuilder';
import MySites from './pages/MySites';
import LandingPage from './pages/LandingPage';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Media from './pages/Media';
import LoadingScreen from './components/LoadingScreen';
import { AnimatePresence } from 'motion/react';

function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: string[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;
  if (role && profile && !role.includes(profile.role)) return <Navigate to="/dashboard" />;

  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/designs" element={<ProtectedRoute role={['admin', 'editor']}><MySites /></ProtectedRoute>} />
          <Route path="/content" element={<ContentEditor />} />
          <Route path="/builder" element={<ProtectedRoute role={['admin', 'editor']}><SiteBuilder /></ProtectedRoute>} />
          <Route path="/media" element={<ProtectedRoute role={['admin', 'editor', 'author']}><Media /></ProtectedRoute>} />
          <Route path="/ecommerce" element={<ProtectedRoute role={['admin', 'editor']}><Ecommerce /></ProtectedRoute>} />
          <Route path="/plugins" element={<Plugins />} />
          <Route path="/plugin/:id" element={<PluginApp />} />
          <Route path="/users" element={<ProtectedRoute role={['admin']}><Users /></ProtectedRoute>} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
