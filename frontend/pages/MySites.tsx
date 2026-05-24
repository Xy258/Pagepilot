import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Eye, 
  Trash2, 
  Clock, 
  ExternalLink, 
  MousePointer2, 
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { QuotaErrorBox } from '../components/QuotaErrorBox';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

interface SavedSite {
  id: string;
  _id: string;
  goal: string;
  sections: any[];
  style: any;
  createdAt: any;
  updatedAt: any;
}

const renderMiniSection = (section: any, style: any, index: number) => {
  const accent = style?.accentColor || '#d97706'; // default amber-600

  switch (section.type) {
    case 'hero':
      return (
        <div key={section.id || index} className="p-2 border-b border-stone-100/50 flex flex-col items-center gap-1 bg-white shrink-0">
          <div className="h-1 bg-stone-900/15 rounded w-1/2" />
          <div className="h-0.5 bg-stone-900/5 rounded w-3/4" />
          <div className="flex gap-1 mt-0.5">
            <div className="h-1.5 w-4 rounded-sm" style={{ backgroundColor: accent }} />
            <div className="h-1.5 w-4 rounded-sm bg-stone-200" />
          </div>
        </div>
      );
    case 'features':
    case 'services':
      return (
        <div key={section.id || index} className="p-2 border-b border-stone-100/50 grid grid-cols-3 gap-1 bg-stone-50/50 shrink-0">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-1 rounded border border-stone-100 flex flex-col gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
              <div className="h-0.5 bg-stone-950/10 rounded w-full" />
              <div className="h-0.5 bg-stone-950/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      );
    case 'gallery':
    case 'portfolio':
    case 'team':
      return (
        <div key={section.id || index} className="p-2 border-b border-stone-100/50 grid grid-cols-2 gap-1 bg-white shrink-0">
          <div className="aspect-[4/3] bg-stone-100 rounded" />
          <div className="aspect-[4/3] bg-stone-100 rounded" />
        </div>
      );
    case 'pricing':
      return (
        <div key={section.id || index} className="p-2 border-b border-stone-100/50 grid grid-cols-3 gap-1 bg-stone-50/50 shrink-0">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-1 rounded border border-stone-100 flex flex-col gap-0.5 items-center">
              <div className="h-1 bg-stone-900/10 rounded w-2/3" />
              <div className="h-2 w-full mt-1 bg-stone-50 rounded" style={{ borderColor: accent }} />
            </div>
          ))}
        </div>
      );
    case 'contact':
    case 'form':
      return (
        <div key={section.id || index} className="p-2 border-b border-stone-100/50 flex flex-col gap-1 bg-white shrink-0">
          <div className="h-1 bg-stone-900/10 rounded w-1/3 mx-auto" />
          <div className="h-2 bg-stone-50 border border-stone-100 rounded w-full" />
          <div className="h-2 rounded-sm w-8 mx-auto" style={{ backgroundColor: accent }} />
        </div>
      );
    case 'footer':
      return (
        <div key={section.id || index} className="p-1.5 bg-stone-900 flex justify-between items-center text-[5px] px-2 text-stone-500 shrink-0">
          <span>© Page Pilot</span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-700" />
            <span className="w-1.5 h-1.5 rounded-full bg-stone-700" />
          </div>
        </div>
      );
    default:
      return (
        <div key={section.id || index} className="p-1.5 border-b border-stone-50 flex items-center justify-between bg-white shrink-0">
          <div className="h-1 bg-stone-900/10 rounded w-1/3" />
          <div className="h-1 bg-stone-900/5 rounded w-1/4" />
        </div>
      );
  }
};

export default function MySites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sites, setSites] = useState<SavedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<SavedSite | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSites = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await api.sites.list();
      setSites(data || []);
    } catch (err) {
      console.error('Failed to fetch sites:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, [user]);

  const initiateDelete = (site: SavedSite, e: React.MouseEvent) => {
    e.stopPropagation();
    setSiteToDelete(site);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!siteToDelete) return;
    const id = siteToDelete._id || siteToDelete.id;
    
    setIsDeleting(true);
    try {
      await api.sites.delete(id);
      setShowDeleteModal(false);
      setSiteToDelete(null);
      fetchSites();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSites = sites.filter(s => 
    (s.goal || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPreviewImage = (site: SavedSite) => {
    // Try to find an image in any section
    const imageSection = site.sections?.find(s => 
      (s.type === 'image' && s.content?.url) || 
      (s.type === 'gallery' && s.content?.urls?.[0])
    );
    
    if (imageSection) {
      if (imageSection.type === 'image') return imageSection.content?.url;
      if (imageSection.type === 'gallery') return imageSection.content?.urls?.[0];
    }
    
    return null;
  };

  return (
    <div className="space-y-8 pb-20">
      {error && <QuotaErrorBox error={error.message || String(error)} />}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-stone-900 tracking-tight">Design Vault</h2>
          <p className="text-stone-500 font-medium">Your collection of envisioned landing pages.</p>
        </div>
        <Link 
          to="/builder"
          className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/20 active:scale-95"
        >
          <Layout size={16} />
          Forgue New Design
        </Link>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400">
          <Search size={18} />
        </div>
        <input 
          type="text"
          placeholder="Search your designs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-stone-100 rounded-[1.5rem] py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-stone-900/5 transition-all shadow-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-stone-200 animate-pulse rounded-[2rem]"></div>
          ))}
        </div>
      ) : filteredSites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSites.map((site, i) => (
            <motion.div
              key={site._id || site.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`group bg-white rounded-[2rem] border border-stone-100 shadow-sm hover:shadow-2xl hover:shadow-stone-900/5 transition-all flex flex-col h-full ${
                activeMenuId === (site._id || site.id) ? 'z-30 relative' : 'z-0'
              }`}
            >
              <div className="aspect-[16/10] bg-stone-50 relative overflow-hidden rounded-t-[2rem] flex items-center justify-center border-b border-stone-50">
                {getPreviewImage(site) ? (
                  <img 
                    src={getPreviewImage(site)} 
                    alt={site.goal} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col justify-start p-3 bg-stone-50/50 select-none overflow-hidden transition-transform duration-700 group-hover:scale-105">
                    {/* Mini Browser Bar */}
                    <div className="h-3 bg-white border border-stone-100 rounded-t-lg flex items-center justify-between px-2 shrink-0 shadow-sm">
                      <div className="flex gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-stone-200" />
                        <span className="w-1 h-1 rounded-full bg-stone-200" />
                        <span className="w-1 h-1 rounded-full bg-stone-200" />
                      </div>
                      <div className="w-1/3 h-1 bg-stone-50 rounded" />
                      <div className="w-3 h-1.5 rounded" style={{ backgroundColor: site.style?.accentColor || '#d97706' }} />
                    </div>
                    
                    {/* Mini Sections */}
                    <div className="flex-1 bg-white border-x border-b border-stone-100 rounded-b-lg overflow-hidden shadow-inner flex flex-col">
                      {site.sections && site.sections.length > 0 ? (
                        site.sections.slice(0, 4).map((sec, idx) => renderMiniSection(sec, site.style, idx))
                      ) : (
                        <div className="flex-1 flex items-center justify-center p-4">
                          <span className="text-[8px] font-bold text-stone-300 uppercase tracking-wider">Empty Slate</span>
                        </div>
                      )}
                      {site.sections && site.sections.length > 4 && (
                        <div className="h-1.5 bg-gradient-to-t from-stone-50 to-transparent shrink-0" />
                      )}
                    </div>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                   <button 
                    onClick={() => navigate('/builder', { state: { site } })}
                    className="p-3 bg-white text-stone-900 rounded-full hover:scale-110 transition-all shadow-xl"
                    title="Edit Design"
                   >
                     <Edit2 size={20} />
                   </button>
                   <button 
                    onClick={(e) => initiateDelete(site, e)}
                    className="p-3 bg-rose-500 text-white rounded-full hover:scale-110 transition-all shadow-xl"
                    title="Exterminate Design"
                   >
                     <Trash2 size={20} />
                   </button>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-stone-900 truncate leading-tight group-hover:text-amber-600 transition-colors">
                      {site.goal || 'Untitled Masterpiece'}
                    </h3>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">
                      {site.sections?.length || 0} Layers • {site.style?.fontFamily || 'serif'}
                    </p>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const id = site._id || site.id;
                        setActiveMenuId(activeMenuId === id ? null : id);
                      }}
                      className="p-2 text-stone-300 hover:text-stone-900 transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>
                    <AnimatePresence>
                      {activeMenuId === (site._id || site.id) && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 w-48 bg-white border border-stone-100 rounded-2xl shadow-2xl overflow-hidden z-50 p-2"
                          >
                            <button 
                              onClick={() => navigate('/builder', { state: { site } })}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold text-stone-600 hover:bg-stone-50 rounded-xl transition-colors uppercase tracking-widest"
                            >
                              <Edit2 size={14} />
                              Edit Design
                            </button>
                            <button 
                              onClick={(e) => {
                                setActiveMenuId(null);
                                initiateDelete(site, e);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors uppercase tracking-widest"
                            >
                              <Trash2 size={14} />
                              Delete Design
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-stone-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest whitespace-nowrap">Status: Encrypted</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-300">
                    <Clock size={12} />
                    <span className="text-[10px] font-medium italic">
                      {site.updatedAt instanceof Date ? site.updatedAt.toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-32 flex flex-col items-center justify-center text-center space-y-6">
           <div className="w-24 h-24 rounded-[2.5rem] bg-stone-50 flex items-center justify-center text-stone-200 border border-stone-100 italic">
              <MousePointer2 size={40} />
           </div>
           <div className="space-y-2">
             <h3 className="text-xl font-serif font-bold text-stone-900 italic">The Vault is Silent</h3>
             <p className="text-stone-400 max-w-xs mx-auto text-sm">You haven't committed any designs to the forge yet. Start building your next masterpiece.</p>
           </div>
           <Link 
            to="/builder"
            className="px-8 py-3 bg-stone-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl active:scale-95"
           >
             Begin First Creation
           </Link>
        </div>
      )}

      {/* Delete Design Modal */}
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
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8 z-10"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-stone-900">Shatter Design</h3>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Permanent Destruction</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-stone-600 leading-relaxed">
                  Are you certain you wish to exterminate this design masterpiece <span className="font-bold text-stone-900">{siteToDelete?.goal || 'Untitled Masterpiece'}</span>? 
                  This will permanently destroy the project and all its layered sections.
                </p>
                <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50">
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest leading-tight">
                    Absolute: This action is final. The design will be erased from the vault.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/20 active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Confirm Extermination'}
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
    </div>
  );
}
