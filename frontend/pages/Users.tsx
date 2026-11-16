/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { notificationService } from '../services/notificationService';
import { 
  Users as UsersIcon, 
  Shield, 
  Mail, 
  Calendar, 
  MoreVertical, 
  Search, 
  UserPlus, 
  Edit2, 
  X, 
  Save, 
  Briefcase, 
  MapPin, 
  Link as LinkIcon,
  Activity,
  Trash2,
  AlertTriangle,
  Info,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

const safeFormatDistanceToNow = (date: any) => {
  if (!date) return 'Recently';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Recently';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch (e) {
    return 'Recently';
  }
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Full sovereign control over the platform, users, and global configuration.',
  editor: 'Authority to manage and refine all content across the entire site.',
  author: 'Creative access to draft and manage personal content submissions.',
  viewer: 'Read-only access to observe the internal directory and dashboard.'
};

export default function Users() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const filteredUsers = users.filter((member) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query || member.displayName?.toLowerCase().includes(query) || member.email?.toLowerCase().includes(query);
    return matchesQuery && (roleFilter === 'all' || member.role === roleFilter);
  });

  const handleExportUsers = () => {
    const rows = [
      ['Name', 'Email', 'Role', 'Joined'],
      ...filteredUsers.map((member) => [
        member.displayName || '',
        member.email || '',
        member.role || '',
        member.createdAt ? new Date(member.createdAt).toISOString().slice(0, 10) : '',
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => {
      const text = String(value);
      const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    }).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'page-pilot-members.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Invite Member Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('author');
  const [isInviting, setIsInviting] = useState(false);

  // Direct Message Modal State
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [userToMessage, setUserToMessage] = useState<any | null>(null);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  // Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [occupation, setOccupation] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Dropdown menu state
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const data = await api.users.list();
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 20000); // Refresh every 20s
    return () => clearInterval(interval);
  }, []);

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setDisplayName(user.displayName || '');
    setJobTitle(user.jobTitle || user.occupation || '');
    setRole(user.role || 'author');
    setBio(user.bio || '');
    setLocation(user.location || '');
    setOccupation(user.occupation || user.jobTitle || '');
    setWebsite(user.website || '');
    setAvatarUrl(user.avatarUrl || '');
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    try {
      const actualId = editingUser._id || editingUser.id;
      await api.users.update(actualId, {
        displayName,
        jobTitle: jobTitle || occupation,
        role,
        bio,
        location,
        occupation: occupation || jobTitle,
        website,
        avatarUrl
      });
      
      // Record admin activity
      await api.adminLogs.record(
        'Update User Profile', 
        `Updated profile/role for ${editingUser.email}. New role: ${role}`
      );
      
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const initiateDelete = (user: any) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const initiateMessage = (user: any) => {
    setUserToMessage(user);
    setMsgTitle('Direct Administrative Message');
    setMsgBody('');
    setShowMsgModal(true);
    setActiveMenu(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToMessage || !msgBody.trim()) return;
    setIsSendingMsg(true);
    try {
      const actualUserId = userToMessage.uid || userToMessage._id || userToMessage.id;
      await api.notifications.create({
        userId: actualUserId,
        title: msgTitle || 'Direct Message',
        message: msgBody,
        type: 'message',
        link: '/settings' // Or somewhere else
      });

      // Record admin activity
      await api.adminLogs.record(
        'Direct Communication', 
        `Sent private message to ${userToMessage.email}. Content: ${msgBody.substring(0, 50)}...`
      );

      setShowMsgModal(false);
      setMsgTitle('');
      setMsgBody('');
      setUserToMessage(null);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSendingMsg(false);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const actualId = userToDelete._id || userToDelete.id;
      // We need a delete endpoint if it exists
      await api.users.delete(actualId);
      
      // Record admin activity
      await api.adminLogs.record(
        'Vanish Artisan', 
        `Permanently removed user ${userToDelete.email} from the workshop.`
      );

      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      await api.users.invite({ email: inviteEmail, role: inviteRole, siteName: 'Artisan Workshop' });
      
      // Record admin activity
      await api.adminLogs.record(
        'Dispatch Invitation', 
        `Sent invitation to ${inviteEmail} with role ${inviteRole}`
      );

      if (profile) {
        notificationService.createNotification({
          userId: profile.uid || profile._id,
          title: 'Invitation Sent',
          message: `Successfully dispatched an invitation to ${inviteEmail}.`,
          type: 'success'
        });
      }

      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('author');
    } catch (error) {
      console.error('Invite failed:', error);
      if (profile) {
        notificationService.createNotification({
          userId: profile.uid || profile._id,
          title: 'Invitation Failed',
          message: `Could not send invitation to ${inviteEmail}.`,
          type: 'error'
        });
      }
    } finally {
      setIsInviting(false);
    }
  };

  // Role Protection
  if (profile && profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Edit User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Edit2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-stone-900">Edit Member</h3>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{editingUser?.email}</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-xl text-stone-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Display Name</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Professional Title</label>
                    <input 
                      type="text" 
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. CMS Architect"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Role</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="author">Author</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Short Bio</label>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-24 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Occupation</label>
                    <input 
                      type="text" 
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Location</label>
                    <input 
                      type="text" 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Personal Website</label>
                  <input 
                    type="text" 
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Avatar URL</label>
                  <input 
                    type="text" 
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-stone-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-all disabled:opacity-50 shadow-xl shadow-stone-900/10"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Update Member</>}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 bg-stone-100 text-stone-500 py-4 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete User Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-stone-900">Vanish Artisan</h3>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Permanent Revocation</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-stone-600 leading-relaxed">
                  Are you certain you wish to let <span className="font-bold text-stone-900">{userToDelete?.displayName || userToDelete?.email}</span> fade from the workshop record? 
                  This will permanently purge their identity and revoke all craftsmanship privileges.
                </p>
                <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50">
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest leading-tight">
                    Absolute: This action is final. The artisan's footprint will be erased immediately.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/20 active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Confirm Vanishing'}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 bg-stone-100 text-stone-500 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-stone-200 transition-all font-display"
                >
                  Hold
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Direct Message Modal */}
      <AnimatePresence>
        {showMsgModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMsgModal(false)}
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-0"
            >
              <div className="p-8 border-b border-stone-50 bg-stone-50/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-black text-stone-900 tracking-tight">Direct Dispatch</h3>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest leading-none mt-0.5">Recipient: {userToMessage?.email}</p>
                  </div>
                </div>
                <button onClick={() => setShowMsgModal(false)} className="p-2 hover:bg-stone-100 rounded-xl text-stone-300 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Message Subject</label>
                  <input 
                    type="text"
                    value={msgTitle}
                    onChange={(e) => setMsgTitle(e.target.value)}
                    placeholder="Brief objective..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-stone-900 font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Internal Communiqué</label>
                  <textarea 
                    autoFocus
                    required
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    placeholder="Inscribe your message to the artisan here..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-stone-900 font-medium min-h-[160px] resize-none"
                  />
                </div>

                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 flex gap-3">
                   <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                   <p className="text-[10px] text-blue-700/70 leading-relaxed font-bold uppercase tracking-wide">
                     The recipient will view this dispatch in their workshop notifications center immediately upon transmission.
                   </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSendingMsg || !msgBody.trim()}
                    className="flex-1 bg-stone-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/20 active:scale-95 disabled:opacity-50"
                  >
                    {isSendingMsg ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Transmit Dispatch'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMsgModal(false)}
                    className="px-8 bg-stone-100 text-stone-500 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-stone-200 transition-all"
                  >
                    Hold
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-serif font-black text-stone-900 mb-2 tracking-tight">Member Directory</h2>
          <p className="text-sm text-stone-500 max-w-md font-medium">Orchestrate your team of writers, editors, and administrators with granular control.</p>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="bg-stone-900 text-white px-8 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/10 active:scale-95"
        >
          <UserPlus size={16} /> Invite Artisan
        </button>
      </div>

      {/* Invite Member Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInviteModal(false)}
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <UserPlus size={20} />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-stone-900">Invite Artisan</h3>
                </div>
                <button onClick={() => setShowInviteModal(false)} className="text-stone-400 hover:text-stone-900"><X size={24} /></button>
              </div>

              <form onSubmit={handleInvite} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-1">Email Address</label>
                  <div className="relative">
                    <input 
                      required
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-stone-900"
                      placeholder="artisan@sculpt.io"
                    />
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-1">Privilege Tier</label>
                  <select 
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-sm appearance-none focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-stone-900"
                  >
                    <option value="admin">Administrator</option>
                    <option value="editor">Editor</option>
                    <option value="author">Author</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                <div className="p-5 bg-stone-50 rounded-[1.5rem] border border-stone-100 flex gap-4">
                   <div className="p-2 bg-white rounded-xl text-stone-400 shrink-0 h-fit">
                      <AlertTriangle size={16} />
                   </div>
                   <p className="text-[11px] text-stone-500 leading-relaxed italic">
                     User will be automatically granted this role when they register with this specific email address.
                   </p>
                </div>

                <button 
                  type="submit"
                  disabled={isInviting}
                  className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10 disabled:opacity-50 active:scale-95"
                >
                  {isInviting ? (
                    <div className="flex items-center justify-center gap-2">
                       <Loader2 size={16} className="animate-spin" />
                       Dispatching...
                    </div>
                  ) : 'Dispatch Invitation'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-200 dark:border-stone-850 shadow-sm overflow-hidden mt-8 transition-colors">
        <div className="p-6 border-b border-stone-50 dark:border-stone-850 bg-stone-50/10 dark:bg-stone-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-4 top-3 text-stone-300 dark:text-stone-600" size={18} />
              <input 
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find a member by name or email..." 
                aria-label="Search members by name or email"
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all outline-none text-stone-900 dark:text-white"
              />
           </div>
           <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter members by role"
                className="min-w-0 flex-1 sm:flex-none bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="all">All roles</option>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="author">Author</option>
                <option value="viewer">Viewer</option>
              </select>
              <button type="button" onClick={handleExportUsers} disabled={filteredUsers.length === 0} className="px-4 py-3 rounded-xl bg-stone-900 dark:bg-emerald-600 text-white text-sm font-semibold hover:bg-stone-800 dark:hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Export CSV
              </button>
           </div>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">             <thead>
              <tr className="border-b border-stone-100 dark:border-stone-850 bg-stone-50/5 dark:bg-stone-950/5">
                <th className="px-8 py-6 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest font-display">Craftsman</th>
                <th className="px-8 py-6 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest font-display">Privileges</th>
                <th className="px-8 py-6 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest font-display">Status & Activity</th>
                <th className="px-8 py-6 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest font-display">Initiated</th>
                <th className="px-8 py-6 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest font-display">Authentication</th>
                <th className="px-8 py-6 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest font-display"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50 dark:divide-stone-850/60">
{filteredUsers.map((user) => {
              const lastLoginDate = user.lastLogin ? new Date(user.lastLogin) : null;
              const profileId = profile?._id || profile?.id || profile?.uid;
              const userId = user?._id || user?.id || user?.uid;
              const isCurrentUser = (profileId && userId && profileId === userId) || (profile?.email && user?.email && profile.email === user.email);
              
              // Active if login in last 10 mins OR if it's the current user
              const isActive = isCurrentUser || 
                               (lastLoginDate && (lastLoginDate.getTime() > Date.now() - 10 * 60 * 1000));
              const isEmailVerified = user.emailVerified ?? user.verified ?? null;

              return (
              <tr key={user._id || user.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-850/15 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-500 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/40 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-all font-bold shadow-sm border border-stone-200/50 dark:border-stone-800 overflow-hidden relative">
{user.avatarUrl ? <img src={user.avatarUrl} referrerPolicy="no-referrer" alt={`${user.displayName || user.email} avatar`} className="w-full h-full object-cover" /> : (user.displayName?.charAt(0) || user.email?.charAt(0))}
                      {user.role === 'admin' && (
                        <div className="absolute inset-0 bg-stone-900/10 flex items-center justify-center">
                          <Activity size={12} className="text-emerald-600 animate-pulse" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-stone-900 dark:text-white tracking-tight">{user.displayName || 'Anonymous Artisan'}</p>
                        {user.role === 'admin' && (
                          <span className="text-[8px] font-black bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-1.5 py-0.5 rounded uppercase tracking-widest shadow-lg shadow-stone-900/20">Founder</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <p className="text-[11px] text-stone-400 font-bold uppercase tracking-tight">{user.email}</p>
                        {user.jobTitle && (
                          <span className="text-[8px] font-black bg-emerald-600 dark:bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest leading-none shadow-sm shadow-emerald-900/10 border border-emerald-400/20">
                            {user.jobTitle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                   <div className="relative group/role">
                      <div className="inline-flex items-center gap-2 bg-stone-50 dark:bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-100 dark:border-stone-850 cursor-help group-hover/role:bg-white dark:group-hover/role:bg-stone-900 group-hover/role:border-emerald-200 dark:group-hover/role:border-emerald-900/40 transition-all">
                        <Shield size={12} className="text-amber-500" />
                        <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300 uppercase tracking-widest font-display leading-none">{user.role}</span>
                        <Info size={10} className="text-stone-300 dark:text-stone-600 group-hover/role:text-blue-400 transition-colors" />
                      </div>
                      
                      <div className="absolute bottom-full left-0 mb-3 w-64 opacity-0 pointer-events-none group-hover/role:opacity-100 group-hover/role:pointer-events-auto transition-all duration-300 transform translate-y-2 group-hover/role:translate-y-0 z-20">
                         <div className="bg-stone-900 dark:bg-stone-950 text-white p-4 rounded-2xl shadow-2xl shadow-stone-900/20 dark:shadow-black/50 text-[11px] font-medium leading-relaxed relative border border-white/5 dark:border-stone-850">
                            <div className="flex items-center gap-2 mb-2 text-emerald-400 border-b border-white/10 dark:border-stone-800 pb-2">
                               <Shield size={12} />
                               <span className="uppercase font-bold tracking-widest">{user.role} Privileges</span>
                            </div>
                            <p className="text-stone-300 dark:text-stone-400">
                               {ROLE_DESCRIPTIONS[String(user.role).toLowerCase()] || 'Standard access level within the platform ecosystem.'}
                            </p>
                            <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-stone-900 dark:bg-stone-950 rotate-45 border-b border-r border-white/5 dark:border-stone-800" />
                         </div>
                      </div>
                   </div>
                </td>
                <td className="px-8 py-6">
                   <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-stone-900 shadow-sm ${
                          isActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-stone-300 dark:bg-stone-750'
                        }`} />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                          isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-stone-500'
                        }`}>
                          {isActive ? 'Active now' : user.lastLogin ? 'Inactive' : 'No activity yet'}
                        </span>
                        <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">
                          {isActive ? 'Current Session' : user.lastLogin ? (
                            safeFormatDistanceToNow(user.lastLogin)
                          ) : safeFormatDistanceToNow(user.createdAt || new Date())}
                        </span>
                      </div>
                   </div>
                </td>
                <td className="px-8 py-6">
                   <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 font-medium text-xs">
                      <Calendar size={14} className="text-stone-300" />
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                   </div>
                </td>
                <td className="px-8 py-6">
                   <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-lg uppercase tracking-[0.14em] border border-emerald-100/50 dark:border-emerald-900/30 font-display">
                     {isEmailVerified === true ? 'Verified' : isEmailVerified === false ? 'Unverified' : 'Not available'}
                   </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button 
                      onClick={() => handleEditUser(user)}
                      className="w-10 h-10 rounded-xl text-stone-300 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center border border-transparent hover:border-blue-100"
                      title="Edit User"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => initiateMessage(user)}
                      className="w-10 h-10 rounded-xl text-stone-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center border border-transparent hover:border-emerald-100"
                      title="Send Private Message"
                    >
                      <Mail size={18} />
                    </button>
                    {(profile?._id !== (user._id || user.id)) && (
                      <button 
                        onClick={() => initiateDelete(user)}
                        className="w-10 h-10 rounded-xl text-stone-300 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center border border-transparent hover:border-rose-100"
                        title="Delete User"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
            </tbody>
           </table>
           {fetching && (
             <div className="p-20 flex items-center justify-center text-stone-400 dark:text-stone-500 bg-white dark:bg-stone-900" role="status" aria-label="Loading members">
               <Loader2 size={32} className="animate-spin" />
             </div>
           )}
           {!fetching && filteredUsers.length === 0 && (
             <p className="px-6 py-10 text-center text-sm text-stone-600 dark:text-stone-400">No members match those filters. Try another search or role.</p>
           )}
         </div>
 
         {/* Mobile Card View */}
         <div className="lg:hidden p-4 space-y-4">
           {!fetching && filteredUsers.length === 0 && <p className="py-10 text-center text-sm text-stone-600 dark:text-stone-400">No members match those filters. Try another search or role.</p>}
           {filteredUsers.map((user) => {
             const lastLoginDate = user.lastLogin ? new Date(user.lastLogin) : null;
             const isActive = (profile?.uid === (user._id || user.id)) || 
                              (lastLoginDate && (lastLoginDate.getTime() > Date.now() - 10 * 60 * 1000));
 
             return (
             <div key={user._id || user.id} className="bg-stone-50/50 dark:bg-stone-950/20 border border-stone-100 dark:border-stone-850 rounded-3xl p-5 space-y-4">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-500 font-bold shadow-sm border border-stone-200/50 dark:border-stone-800 overflow-hidden">
                     {user.avatarUrl ? <img src={user.avatarUrl} referrerPolicy="no-referrer" alt={`${user.displayName || user.email} avatar`} className="w-full h-full object-cover" /> : (user.displayName?.charAt(0) || user.email?.charAt(0))}
                   </div>
                   <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-stone-900 dark:text-white tracking-tight">{user.displayName || 'Anonymous'}</p>
                      {user.role === 'admin' && (
                        <span className="text-[8px] font-black bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-1.5 py-0.5 rounded uppercase tracking-widest shadow-sm">Founder</span>
                      )}
                      {user.jobTitle && (
                        <span className="text-[8px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded uppercase tracking-widest leading-none">
                          {user.jobTitle}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEditUser(user)}
                    type="button"
                    aria-label={`Edit ${user.displayName || user.email}`}
                    className="p-2.5 text-stone-500 dark:text-stone-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <Edit2 size={16} />
                  </button>
                  {(profile?._id !== (user._id || user.id)) && (
                    <button 
                      onClick={() => initiateDelete(user)}
                      type="button"
                      aria-label={`Delete ${user.displayName || user.email}`}
                      className="p-2.5 text-stone-500 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-1.5 bg-white dark:bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-100 dark:border-stone-850">
                  <Shield size={10} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[9px] font-bold text-stone-600 dark:text-stone-300 uppercase tracking-widest leading-none">{user.role}</span>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-sm ${
                  isActive ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100/30 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-white dark:bg-stone-950 border-stone-100 dark:border-stone-850 text-stone-500 dark:text-stone-400'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300 dark:bg-stone-750'
                  }`} />
                  <span className="text-[9px] font-bold uppercase tracking-widest leading-none">
                    {isActive ? 'Active now' : user.lastLogin ? 'Inactive' : 'No activity yet'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-stone-850 flex items-center justify-between">
                 <div className="flex items-center gap-1.5 text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest">
                    <Calendar size={10} className="text-blue-400" />
                    Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Recently'}
                 </div>
                 <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-md uppercase tracking-widest flex items-center gap-1 border border-emerald-100/10 dark:border-emerald-900/10">
                   {user.lastLogin ? `Last Login: ${safeFormatDistanceToNow(user.lastLogin)}` : safeFormatDistanceToNow(user.createdAt || new Date())}
                 </span>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
