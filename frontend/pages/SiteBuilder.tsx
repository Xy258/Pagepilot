/**
 * Site Builder Page
 * A highly interactive, drag-and-drop landing page editor.
 */

import React, { useState, useEffect } from 'react';
import { 
  Wand2, 
  Layout, 
  Palette, 
  Save, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Sparkles,
  Eye,
  Type,
  ImageIcon,
  MousePointer2,
  Share2,
  GripVertical,
  X,
  RotateCcw,
  Baseline,
  Settings2,
  Check,
  Edit3,
  Loader2,
  ShoppingBag,
  Rocket,
  Mail,
  Tablet,
  Smartphone,
  Monitor,
  Globe,
  MoreVertical,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { geminiService } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { notificationService } from '../services/notificationService';
import { api } from '../lib/api';

interface Section {
  id: string;
  type: 'hero' | 'features' | 'testimonials' | 'cta' | 'contact' | 'text' | 'image' | 'gallery' | 'pricing' | 'footer';
  content: any;
  style: 'minimal' | 'bold' | 'glass' | 'brutalist';
}

interface SiteStyle {
  primaryColor: string;
  accentColor: string;
  fontFamily: 'serif' | 'sans' | 'mono' | 'display';
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full';
}

function SortableItem({ 
  section, 
  isPreviewMode, 
  removeSection, 
  moveSection, 
  idx, 
  style,
  isSelected,
  onSelect,
  isFirst,
  isLast,
  onRefine,
  isRefining
}: { 
  section: Section, 
  isPreviewMode: boolean, 
  removeSection: (id: string) => void, 
  moveSection: (index: number, direction: 'up' | 'down') => void,
  idx: number,
  style: SiteStyle,
  isSelected: boolean,
  onSelect: () => void,
  isFirst: boolean,
  isLast: boolean,
  onRefine: (id: string, prompt: string) => void,
  isRefining: boolean
}) {
  const [localPrompt, setLocalPrompt] = useState('');
  const [showAIInput, setShowAIInput] = useState(false);

  const sortableId = isPreviewMode ? `${section.id}-preview` : section.id;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: sortableId });

  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  const getFontClass = () => {
    switch (style.fontFamily) {
      case 'serif': return 'font-serif';
      case 'mono': return 'font-mono';
      case 'display': return 'font-display';
      default: return 'font-sans';
    }
  };

  const getRadiusClass = () => {
    switch (style.borderRadius) {
      case 'none': return 'rounded-none';
      case 'small': return 'rounded-lg';
      case 'medium': return 'rounded-2xl';
      case 'large': return 'rounded-[2.5rem]';
      case 'full': return 'rounded-[4rem]';
      default: return 'rounded-[2rem]';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={dndStyle}
      onClick={onSelect}
      className={`group relative bg-white transition-all overflow-hidden
        ${!isPreviewMode ? `${getRadiusClass()} border mb-4 cursor-pointer p-8` : 'p-0 mb-0'}
        ${isSelected && !isPreviewMode ? 'border-amber-400 ring-4 ring-amber-400/5 shadow-2xl' : !isPreviewMode ? 'border-stone-100 shadow-sm' : ''}
        ${!isPreviewMode ? 'hover:shadow-2xl hover:shadow-stone-900/5' : ''}
        ${isDragging ? 'opacity-60 scale-[0.98] ring-4 ring-stone-900/5 rotate-1' : ''}
        ${isRefining ? 'pointer-events-none' : ''}`}
    >
      <AnimatePresence>
        {isRefining && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center space-y-4"
          >
            <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-amber-400 blur-2xl rounded-full"
              />
              <Loader2 size={32} className="text-amber-500 animate-spin relative z-10" />
            </div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em] font-serif">Refining Essence...</p>
          </motion.div>
        )}
      </AnimatePresence>
      {!isPreviewMode && (
        <div className={`absolute top-4 left-4 flex items-center gap-2 transition-all duration-300 transform 
          ${isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0'}`}>
          <div {...attributes} {...listeners} className="p-2 hover:bg-stone-50 rounded-lg text-stone-400 cursor-grab active:cursor-grabbing transition-colors">
            <GripVertical size={16} />
          </div>
          <span className="text-[10px] font-bold text-stone-300 uppercase tracking-[0.2em]">{section.type}</span>
        </div>
      )}

      {!isPreviewMode && (
        <div className={`absolute top-4 right-4 flex gap-1 transition-all duration-300 transform 
          ${isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0'}`}>
          <button 
            onClick={(e) => { e.stopPropagation(); onRefine(section.id, "Improve this content to be more engaging, professional and aligned with the high-quality professional aesthetic while keeping the same structure."); }} 
            className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-500 hover:text-amber-600 transition-colors"
            title="Auto-Polish with AI"
          >
            <Sparkles size={14}/>
          </button>
          <div className="w-px h-4 bg-stone-100 mx-1 self-center" />
          <button 
            onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }} 
            disabled={isFirst}
            className="p-1.5 hover:bg-stone-50 rounded-lg text-stone-300 hover:text-stone-900 disabled:opacity-20 transition-colors"
          >
            <ChevronUp size={14}/>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }} 
            disabled={isLast}
            className="p-1.5 hover:bg-stone-50 rounded-lg text-stone-300 hover:text-stone-900 disabled:opacity-20 transition-colors"
          >
            <ChevronDown size={14}/>
          </button>
          <div className="w-px h-4 bg-stone-100 mx-1 self-center" />
          <button 
            onClick={(e) => { e.stopPropagation(); removeSection(section.id); }} 
            className="p-1.5 hover:bg-rose-50 rounded-lg text-stone-200 hover:text-rose-500 transition-colors"
          >
            <Trash2 size={14}/>
          </button>
        </div>
      )}

      <div className={`space-y-6 ${getFontClass()}`}>
        {section.type === 'hero' && (
          <div className="text-center py-12 space-y-6">
            <h1 className={`text-4xl font-bold tracking-tight leading-tight px-4`} style={{ color: style.primaryColor }}>
              {section.content.title}
            </h1>
            <p className="text-stone-500 max-w-sm mx-auto text-sm leading-relaxed font-medium">
              {section.content.subtitle}
            </p>
            <button 
              className={`px-8 py-3 text-white ${getRadiusClass()} text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-lg`}
              style={{ backgroundColor: style.accentColor }}
            >
              {section.content.buttonText}
            </button>
          </div>
        )}

        {section.type === 'features' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            {section.content.items?.map((item: any, i: number) => (
              <div key={i} className="flex gap-4 items-start p-5 bg-stone-50 rounded-2xl border border-stone-100/50">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0" style={{ color: style.accentColor }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900 mb-1">{item.title}</h4>
                  <p className="text-[11px] text-stone-500 leading-relaxed font-medium">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {section.type === 'text' && (
          <div className="py-8 px-6 space-y-4">
             <h3 className="text-xl font-bold text-stone-900" style={{ color: style.primaryColor }}>{section.content.title}</h3>
             <div className="text-sm text-stone-600 leading-relaxed font-medium whitespace-pre-wrap">
               {section.content.body}
             </div>
          </div>
        )}

        {section.type === 'image' && (
          <div className={`overflow-hidden ${getRadiusClass()} bg-stone-100 border border-stone-200 aspect-[16/9] relative group/img`}>
             <img src={section.content.url || 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&auto=format&fit=crop'} alt="Section" className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" />
             <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 to-transparent flex items-end p-8">
               <p className="text-white text-xs font-bold uppercase tracking-widest opacity-80">{section.content.caption}</p>
             </div>
          </div>
        )}

        {section.type === 'gallery' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-2">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className={`aspect-square bg-stone-100 ${getRadiusClass()} overflow-hidden border border-stone-100`}>
                <img src={section.content.urls?.[i] || `https://images.unsplash.com/photo-${1500 + i}?w=400&h=400&fit=crop`} alt="Gallery" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {section.type === 'pricing' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-8">
            {section.content.tiers?.map((tier: any, i: number) => (
              <div key={i} className={`p-6 rounded-3xl border ${i === 1 ? 'border-amber-200 bg-amber-50/30' : 'border-stone-100 bg-stone-50/50'} text-center space-y-4`}>
                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">{tier.name}</h4>
                <p className="text-2xl font-bold text-stone-900" style={{ color: i === 1 ? style.accentColor : style.primaryColor }}>
                  {tier.price}
                </p>
                <div className="space-y-2">
                   {tier.features?.map((f: string, j: number) => (
                     <p key={j} className="text-[10px] text-stone-500 font-medium">{f}</p>
                   ))}
                </div>
                <button 
                  className={`w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${i === 1 ? 'bg-stone-900 text-white' : 'border border-stone-200 text-stone-500 hover:bg-stone-100'}`}
                >
                  Choose {tier.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {section.type === 'testimonials' && (
          <div className="space-y-8 py-8">
            <div className="text-[10px] font-bold text-stone-300 uppercase tracking-[0.2em] text-center">Audience Reviews</div>
            <div className="grid grid-cols-1 gap-10 px-8">
              {section.content.v?.map((v: any, i: number) => (
                <div key={i} className="text-center space-y-4">
                  <div className="text-4xl text-stone-200 font-serif leading-none opacity-20">"</div>
                  <p className="text-lg text-stone-800 leading-relaxed italic px-4">"{v.text}"</p>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-px bg-stone-100 mb-4" />
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                      {v.author} <span className="opacity-40 px-2">|</span> {v.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section.type === 'cta' && (
          <div 
            className={`p-10 text-center text-white ${getRadiusClass()} space-y-8 overflow-hidden relative shadow-2xl`}
            style={{ backgroundColor: style.primaryColor }}
          >
            <div className="absolute inset-0 opacity-10 bg-white/5" />
            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl font-bold tracking-tight">{section.content.title || 'Start Your Journey'}</h2>
              <div className="flex flex-col items-center gap-6">
                <p className="text-white/60 text-xs italic font-medium">{section.content.ctaText || 'Connect with the designer today'}</p>
                <div className="w-32 h-px bg-white/20" />
                <button 
                  className={`px-10 py-4 bg-white rounded-2xl text-xs font-bold uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl`}
                  style={{ color: style.primaryColor }}
                >
                  {section.content.buttonLabel || 'Get Started'}
                </button>
              </div>
            </div>
          </div>
        )}

        {section.type === 'contact' && (
          <div className="py-8 px-6 space-y-6">
             <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-stone-900">{section.content.title || 'Get in Touch'}</h3>
                <p className="text-xs text-stone-400 font-medium">{section.content.subtitle || 'We typically reply within 24 hours'}</p>
             </div>
             <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <input placeholder="Name" className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all" />
                   <input placeholder="Email" className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all" />
                </div>
                <textarea placeholder="Your Message" className="w-full bg-stone-50 border border-stone-100 rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all h-24 resize-none" />
                <button className={`w-full py-3 text-white font-bold uppercase tracking-widest text-[10px] ${getRadiusClass()} transition-all shadow-lg shadow-stone-900/10`} style={{ backgroundColor: style.primaryColor }}>
                   Send Inquiry
                </button>
             </div>
          </div>
        )}

        {section.type === 'footer' && (
          <div className="pt-8 pb-4 border-t border-stone-100 text-center space-y-6">
             <div className="flex justify-center gap-8 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                <span className="hover:text-stone-900 cursor-pointer transition-colors font-display">About</span>
                <span className="hover:text-stone-900 cursor-pointer transition-colors font-display">Privacy</span>
                <span className="hover:text-stone-900 cursor-pointer transition-colors font-display">Terms</span>
                <span className="hover:text-stone-900 cursor-pointer transition-colors font-display">Contact</span>
             </div>
             <p className="text-[10px] text-stone-300 font-medium uppercase tracking-[0.2em]">© 2026 {section.content.companyName || 'Page Pilot'}. All Rights Reserved.</p>
             <div className="flex justify-center gap-2 grayscale brightness-50 opacity-30">
                <Rocket size={10} className="text-stone-400" />
                <span className="text-[7px] font-black uppercase tracking-[0.3em] text-stone-400">Created with Page Pilot</span>
             </div>
          </div>
        )}
      </div>


      <AnimatePresence>
        {isSelected && !isPreviewMode && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent z-40"
          >
            {!showAIInput ? (
              <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); onRefine(section.id, "Completely rewrite this section with ultra-creative, high-conversion copy based on the site mission."); }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-500/20 active:scale-95"
                >
                  <Wand2 size={14} />
                  Expressive Rewrite
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowAIInput(true); }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-stone-800 transition-all shadow-xl shadow-stone-950/20 active:scale-95"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  Custom Instructions
                </button>
              </div>
            ) : (
              <motion.div 
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="max-w-md mx-auto bg-stone-50 border border-stone-200 rounded-2xl p-2 flex items-center gap-2 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <textarea
                  autoFocus
                  placeholder="Ex: Make it more formal, expand on the features..."
                  value={localPrompt}
                  onChange={(e) => setLocalPrompt(e.target.value)}
                  className="flex-1 bg-transparent border-none text-xs font-medium p-3 focus:outline-none resize-none h-10 custom-scrollbar"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onRefine(section.id, localPrompt);
                      setLocalPrompt('');
                      setShowAIInput(false);
                    }
                  }}
                />
                <div className="flex items-center gap-1 shrink-0 p-1">
                  <button 
                    onClick={() => setShowAIInput(false)}
                    className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <button 
                    disabled={!localPrompt || isRefining}
                    onClick={() => {
                      onRefine(section.id, localPrompt);
                      setLocalPrompt('');
                      setShowAIInput(false);
                    }}
                    className="aspect-square p-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all disabled:opacity-20 flex items-center justify-center"
                  >
                    {isRefining ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Wand2 size={16} />
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SiteTheme {
  _id?: string;
  id?: string;
  name: string;
  primary: string;
  accent: string;
  font: SiteStyle['fontFamily'];
  radius: SiteStyle['borderRadius'];
}

const SITE_THEMES: SiteTheme[] = [
  { id: 'minimal', name: 'Minimalist', primary: '#1c1917', accent: '#10b981', font: 'serif', radius: 'medium' },
  { id: 'emerald', name: 'Deep Emerald', primary: '#064e3b', accent: '#34d399', font: 'serif', radius: 'large' },
  { id: 'monochrome', name: 'Monochrome', primary: '#000000', accent: '#ffffff', font: 'display', radius: 'none' },
  { id: 'midnight', name: 'Midnight', primary: '#0f172a', accent: '#38bdf8', font: 'mono', radius: 'none' },
  { id: 'modern', name: 'Modern', primary: '#1e293b', accent: '#6366f1', font: 'sans', radius: 'small' },
];

const getDefaultContentForType = (type: string) => {
  switch (type) {
    case 'hero': return { title: 'New Visionary Header', subtitle: 'A compelling subheadline for your next masterpiece.', buttonText: 'Explore Collection' };
    case 'features': return { items: [{ title: 'Unique Quality', description: 'Exceptional attention to detail in every aspect.' }, { title: 'Modern Aesthetic', description: 'Clean lines and purposeful whitespace.' }] };
    case 'text': return { title: 'The Story', body: 'Write your narrative here. This section is perfect for deeper context and building trust with your audience.' };
    case 'image': return { url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&auto=format&fit=crop', caption: 'Atmospheric Visual' };
    case 'gallery': return { urls: ['https://images.unsplash.com/photo-1500?w=400', 'https://images.unsplash.com/photo-1501?w=400', 'https://images.unsplash.com/photo-1502?w=400'] };
    case 'pricing': return { tiers: [{ name: 'Essential', price: '₹999', features: ['Core access', 'Standard support'] }, { name: 'Visionary', price: '₹2,499', features: ['Full access', 'Priority support', 'Custom tweaks'] }] };
    case 'testimonials': return { v: [{ author: 'Alex Rivers', text: 'Truly a remarkable transformation of our digital presence.', role: 'Creative Director' }] };
    case 'cta': return { title: 'Ready to Manifest?', ctaText: 'Join the community of innovators today.', buttonLabel: 'Start Now' };
    case 'contact': return { title: 'Reach Out', subtitle: 'We are here to help you build.' };
    case 'footer': return { companyName: 'Page Pilot Designer' };
    default: return {};
  }
};

export default function SiteBuilder() {
  const { user } = useAuth();
  const { toast } = useNotifications();
  const [siteGoal, setSiteGoal] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [history, setHistory] = useState<Section[][]>([]);
  const [redoStack, setRedoStack] = useState<Section[][]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedStyle, setSelectedStyle] = useState<'minimal' | 'bold' | 'glass' | 'brutalist'>('minimal');
  const [showProperties, setShowProperties] = useState(false);
  
  const selectedSection = sections.find(s => s.id === selectedSectionId);
  const [siteStyle, setSiteStyle] = useState<SiteStyle>({
    primaryColor: SITE_THEMES[0].primary,
    accentColor: SITE_THEMES[0].accent,
    fontFamily: SITE_THEMES[0].font,
    borderRadius: SITE_THEMES[0].radius
  });

  const [activeThemeId, setActiveThemeId] = useState<string>(SITE_THEMES[0].id || '');
  const [customThemes, setCustomThemes] = useState<SiteTheme[]>([]);
  const [showThemeManager, setShowThemeManager] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Partial<SiteTheme> | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'controls' | 'preview'>('controls');
  const [showDeleteThemeModal, setShowDeleteThemeModal] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<SiteTheme | null>(null);
  const [isDeletingTheme, setIsDeletingTheme] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSavingSite, setIsSavingSite] = useState(false);

  const fetchThemes = async () => {
    try {
      const themes = await api.themes.list();
      setCustomThemes(themes);
    } catch (err) {
      console.error('Failed to fetch themes:', err);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  const location = useLocation();

  useEffect(() => {
    if (location.state?.site) {
      const site = location.state.site;
      setSiteGoal(site.goal || '');
      setSections(site.sections || []);
      if (site.style) {
        setSiteStyle(site.style);
      }
      // Clear state so it doesn't reload on every mount
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const allThemes = [...SITE_THEMES, ...customThemes];

  const applyTheme = (theme: SiteTheme) => {
    setActiveThemeId((theme._id || theme.id) || '');
    setSiteStyle({
      primaryColor: theme.primary,
      accentColor: theme.accent,
      fontFamily: theme.font,
      borderRadius: theme.radius
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSaveSite = () => {
    if (sections.length === 0) return;
    setShowSaveModal(true);
  };

  const confirmSaveSite = async () => {
    if (sections.length === 0 || isSavingSite) return;
    setIsSavingSite(true);
    try {
      await api.sites.create({
        goal: siteGoal,
        sections,
        style: siteStyle,
      });

      if (user) {
        notificationService.createNotification({
          userId: user.uid,
          title: 'Design Vaulted',
          message: 'Your site blueprint has been successfully committed to the secure vault.',
          type: 'success'
        });

        // Notify admins
        notificationService.notifyAdmins({
          title: 'New Site Blueprint',
          message: `${user.displayName || user.email} has committed a new site design for: ${siteGoal.substring(0, 30)}...`,
          type: 'info'
        });
      }

      setShowSaveModal(false);
    } catch (error) {
      console.error('Save failed:', error);
      toast('Save Failed', 'Could not save the design.', 'error');
    } finally {
      setIsSavingSite(false);
    }
  };

  const pushToHistory = (newSections: Section[]) => {
    setHistory(prev => [...prev, sections]);
    setRedoStack([]);
    setSections(newSections);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack(prev => [...prev, sections]);
    setHistory(prev => prev.slice(0, -1));
    setSections(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory(prev => [...prev, sections]);
    setRedoStack(prev => prev.slice(0, -1));
    setSections(next);
  };

  const clearAll = () => {
    setShowClearModal(true);
  };

  const confirmClearAll = () => {
    pushToHistory([]);
    setShowClearModal(false);
  };

  const extractJSON = (text: string) => {
    // Remove markdown code blocks
    let cleaned = text.replace(/```json\n?|```/g, '').trim();
    // Try direct parse first
    try { return JSON.parse(cleaned); } catch {}
    // Try extracting first [...] array
    const arrMatch = cleaned.match(/(\[.*\])/s);
    if (arrMatch) { try { return JSON.parse(arrMatch[1]); } catch {} }
    // Try extracting first {...} object
    const objMatch = cleaned.match(/({.*})/s);
    if (objMatch) { try { return JSON.parse(objMatch[1]); } catch {} }
    throw new Error('Could not parse AI response as JSON');
  };

  const handleGenerateFullSite = async () => {
    if (!siteGoal) {
      setSiteGoal('AI-powered CMS for effortless site creation and management');
    }
    
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const responseText = await geminiService.generateContent(
        `Site Goal: "${siteGoal || 'AI-powered CMS for effortless site creation and management'}". Style: ${selectedStyle}. 
        Return a JSON ARRAY of sections. Each section must have "type" (one of: hero, features, text, image, gallery, pricing, cta, testimonials, contact, footer) and "content" matching its schema:
        - hero: { "title": string, "subtitle": string, "buttonText": string }
        - features: { "items": [{ "title": string, "description": string }] }
        - testimonials: { "v": [{ "author": string, "text": string, "role": string }] }
        - cta: { "title": string, "ctaText": string, "buttonLabel": string }
        - pricing: { "tiers": [{ "name": string, "price": string, "features": [string] }] } (CRITICAL: Use ₹ Indian Rupee symbol for all prices)
        
        Generate exactly these 4 sections in order: hero, features, testimonials, cta.
        Return ONLY the JSON array. No explanation. No markdown.`,
        `You are a professional web strategist. Generate a complete, high-converting landing page structure in JSON format as an array of objects. Always use ₹ symbol for any monetary values. Return ONLY valid JSON.`
      );

      let generatedSections: any[];
      try {
        generatedSections = extractJSON(responseText);
        if (!Array.isArray(generatedSections)) {
          throw new Error('AI response was not an array of sections');
        }
      } catch (parseErr: any) {
        console.error('JSON parse error:', parseErr, 'Raw response:', responseText);
        // Fallback: build a default site structure if AI response is unparseable
        generatedSections = [
          { type: 'hero', content: { title: siteGoal || 'Welcome', subtitle: 'Built with Page Pilot AI', buttonText: 'Get Started' } },
          { type: 'features', content: { items: [{ title: 'AI Powered', description: 'Intelligent content generation.' }, { title: 'Fast & Modern', description: 'Built for speed and quality.' }] } },
          { type: 'cta', content: { title: 'Ready to Start?', ctaText: 'Join thousands of creators.', buttonLabel: 'Begin Now' } },
        ];
      }
      
      const newSections = generatedSections.map((s: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        type: s.type,
        content: s.content,
        style: selectedStyle
      }));
      
      setHistory(prev => [...prev, sections]);
      setRedoStack([]);
      setSections(newSections);
      
      if (user) {
        notificationService.createNotification({
          userId: user.uid,
          title: 'Architect: Masterpiece Envisioned',
          message: 'AI has constructed a complete multi-layered landing page from your goal.',
          type: 'success'
        });
      }
    } catch (error: any) {
      console.error('Full generation failed:', error);
      const msg = error?.message || 'Unknown error';
      if (msg.includes('API_KEY') || msg.includes('401') || msg.includes('403')) {
        setGenerationError('API key issue. Please check your Gemini API key in the settings.');
      } else if (msg.includes('quota') || msg.includes('429')) {
        setGenerationError('API quota exceeded. The AI will try again shortly.');
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
        setGenerationError('Network error. Please check your internet connection and try again.');
      } else {
        setGenerationError(`Generation failed: ${msg}. Try again or simplify your goal.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setHistory(prev => [...prev, sections]);
      setRedoStack([]);
      setSections((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleGenerateSection = async (type: Section['type'], promptOverride?: string, isManual: boolean = false) => {
    let currentGoal = siteGoal;
    if (!currentGoal) {
      currentGoal = 'High-end professional landing page with focus on conversion and aesthetics';
      setSiteGoal(currentGoal);
    }

    if (isManual) {
       const content = getDefaultContentForType(type);
       const newSection: Section = {
         id: Math.random().toString(36).substr(2, 9),
         type,
         content,
         style: selectedStyle
       };
       pushToHistory([...sections, newSection]);
       setSelectedSectionId(newSection.id);
       return;
    }
    
    setIsGenerating(true);
    try {
      const basePrompt = promptOverride 
        ? `Site Goal: "${currentGoal}". Section Request: "${promptOverride}". Style: ${selectedStyle}.`
        : `Site Goal: "${currentGoal}". Style: ${selectedStyle}.`;

      const responseText = await geminiService.generateContent(
        `${basePrompt} 
        Return JSON with fields matching the section type:
        - hero: { "title": string, "subtitle": string, "buttonText": string }
        - features: { "items": [{ "title": string, "description": string }] }
        - text: { "title": string, "body": string }
        - image: { "url": string (placeholder if needed), "caption": string }
        - gallery: { "urls": [string, string, string] }
        - pricing: { "tiers": [{ "name": string, "price": string, "features": [string] }] } (CRITICAL: Use ₹ Indian Rupee symbol)
        - cta: { "title": string, "ctaText": string, "buttonLabel": string }
        - testimonials: { "v": [{ "author": string, "text": string, "role": string }] }
        - contact: { "title": string, "subtitle": string }
        - footer: { "companyName": string }
        Return ONLY the JSON object. No explanation. No markdown.`,
        `You are a professional web designer. Generate structured content for a ${type} section in JSON format. Always use ₹ symbol for any monetary values. Return ONLY valid JSON.`
      );

      let content: any;
      try {
        content = extractJSON(responseText);
      } catch {
        // Fallback to default content if AI response is unparseable
        content = getDefaultContentForType(type);
      }
      
      const newSection: Section = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        content,
        style: selectedStyle
      };
      
      pushToHistory([...sections, newSection]);
    } catch (error: any) {
      console.error('Generation failed:', error);
      const msg = error?.message || '';
      if (msg.includes('quota') || msg.includes('429')) {
        setGenerationError('API quota exceeded. Try again in a moment.');
      } else {
        // Still add a default section so user isn't blocked
        const newSection: Section = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          content: getDefaultContentForType(type),
          style: selectedStyle
        };
        pushToHistory([...sections, newSection]);
        setGenerationError('AI generation hit an issue — added a template section instead. Edit it freely.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineContent = async (id: string, prompt: string) => {
    const sectionIndex = sections.findIndex(s => s.id === id);
    if (sectionIndex === -1) return;

    setIsRefining(true);
    try {
      const section = sections[sectionIndex];
      const responseText = await geminiService.refineContent(
        section.content,
        prompt,
        section.type
      );

      const newContent = JSON.parse(responseText || '{}');
      const updatedSections = [...sections];
      updatedSections[sectionIndex] = {
        ...section,
        content: newContent
      };
      
      pushToHistory(updatedSections);
    } catch (error) {
      console.error('Refinement failed:', error);
      alert('AI refinement went off track. Try a simpler prompt.');
    } finally {
      setIsRefining(false);
    }
  };

  const removeSection = (id: string) => {
    pushToHistory(sections.filter(s => s.id !== id));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    pushToHistory(newSections);
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTheme?.name) return;

    try {
      const themeData = {
        name: editingTheme.name,
        primary: editingTheme.primary || siteStyle.primaryColor,
        accent: editingTheme.accent || siteStyle.accentColor,
        font: editingTheme.font || siteStyle.fontFamily,
        radius: editingTheme.radius || siteStyle.borderRadius,
        isCustom: true,
      };

      if (editingTheme._id || editingTheme.id) {
        await api.themes.update((editingTheme._id || editingTheme.id) as string, themeData);
      } else {
        await api.themes.create(themeData);
      }
      setEditingTheme(null);
      fetchThemes();
    } catch (error) {
      console.error('Theme save failed:', error);
    }
  };

  const initiateDeleteTheme = (theme: SiteTheme) => {
    setThemeToDelete(theme);
    setShowDeleteThemeModal(true);
  };

  const confirmDeleteTheme = async () => {
    if (!themeToDelete) return;
    const id = themeToDelete._id || themeToDelete.id;
    if (!id) {
       console.error('Theme ID missing for deletion');
       return;
    }
    
    setIsDeletingTheme(true);
    console.log('Targeting theme for deletion:', id);
    // Optimistic update
    setCustomThemes(prev => prev.filter(t => (t._id || t.id) !== id));
    
    try {
      await api.themes.delete(id);
      console.log('Deletion confirmed by server for:', id);
      if (activeThemeId === id) {
        applyTheme(SITE_THEMES[0]);
      }
      setShowDeleteThemeModal(false);
      setThemeToDelete(null);
      // Final sync
      fetchThemes();
    } catch (error) {
      console.error('Theme deletion failed:', error);
      // Revert on error
      fetchThemes();
      if (typeof toast === 'function') {
        toast('Deletion Failed', 'Permission denied or connection lost.', 'error');
      } else {
        alert('Theme deletion failed. Permission denied or connection lost.');
      }
    } finally {
      setIsDeletingTheme(false);
    }
  };

  const handleUpdateSectionContent = (id: string, newContent: any) => {
    const updatedSections = sections.map(s => s.id === id ? { ...s, content: newContent } : s);
    setHistory(prev => [...prev, sections]);
    setRedoStack([]);
    setSections(updatedSections);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 md:gap-8 h-[calc(100vh-14rem)] lg:h-[calc(100vh-12rem)] relative overflow-x-hidden md:overflow-x-visible">
      {/* Premium Sticky Mobile Tab Bar */}
      <div className="lg:hidden flex items-center justify-center p-2 bg-stone-100/80 backdrop-blur-md rounded-2xl border border-stone-200/50 sticky top-0 z-40 mx-4 shadow-sm mb-2 w-full">
        <button
          onClick={() => setActiveMobileTab('controls')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
            activeMobileTab === 'controls'
              ? 'bg-stone-900 text-white shadow-md shadow-stone-900/10'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <Palette size={14} />
          Architect
        </button>
        <button
          onClick={() => setActiveMobileTab('preview')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
            activeMobileTab === 'preview'
              ? 'bg-stone-900 text-white shadow-md shadow-stone-900/10'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <Eye size={14} />
          Preview
        </button>
      </div>

      {/* Properties Editor Sidebar */}
      <AnimatePresence>
        {selectedSection && showProperties && (
          <motion.div 
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            className="fixed top-0 right-0 bottom-0 w-80 bg-white border-l border-stone-200 z-[100] shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900">Properties</h3>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{selectedSection.type}</p>
              </div>
              <button onClick={() => setShowProperties(false)} className="p-2 hover:bg-stone-100 rounded-xl text-stone-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Dynamic properties based on section type */}
              {selectedSection.type === 'hero' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 block">Headline</label>
                    <textarea 
                      value={selectedSection.content.title}
                      onChange={(e) => handleUpdateSectionContent(selectedSection.id, { ...selectedSection.content, title: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3 text-xs font-medium focus:outline-none focus:ring-4 focus:ring-stone-900/5 transition-all text-stone-900 resize-none h-24"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 block">Subheadline</label>
                    <textarea 
                      value={selectedSection.content.subtitle}
                      onChange={(e) => handleUpdateSectionContent(selectedSection.id, { ...selectedSection.content, subtitle: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3 text-xs font-medium focus:outline-none focus:ring-4 focus:ring-stone-900/5 transition-all text-stone-900 resize-none h-24"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 block">Button Text</label>
                    <input 
                      value={selectedSection.content.buttonText}
                      onChange={(e) => handleUpdateSectionContent(selectedSection.id, { ...selectedSection.content, buttonText: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {selectedSection.type === 'text' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 block">Section Title</label>
                    <input 
                      value={selectedSection.content.title}
                      onChange={(e) => handleUpdateSectionContent(selectedSection.id, { ...selectedSection.content, title: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 block">Body Content</label>
                    <textarea 
                      value={selectedSection.content.body}
                      onChange={(e) => handleUpdateSectionContent(selectedSection.id, { ...selectedSection.content, body: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3 text-xs font-medium focus:outline-none focus:ring-4 focus:ring-stone-900/5 transition-all text-stone-900 resize-none h-64"
                    />
                  </div>
                </div>
              )}

              {selectedSection.type === 'features' && (
                <div className="space-y-4">
                   <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Features</label>
                   {selectedSection.content.items?.map((item: any, i: number) => (
                     <div key={i} className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
                        <input 
                          value={item.title}
                          onChange={(e) => {
                            const newItems = [...selectedSection.content.items];
                            newItems[i] = { ...item, title: e.target.value };
                            handleUpdateSectionContent(selectedSection.id, { ...selectedSection.content, items: newItems });
                          }}
                          placeholder="Feature Title"
                          className="w-full bg-white border border-stone-100 rounded-lg px-3 py-2 text-xs font-bold"
                        />
                        <textarea 
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...selectedSection.content.items];
                            newItems[i] = { ...item, description: e.target.value };
                            handleUpdateSectionContent(selectedSection.id, { ...selectedSection.content, items: newItems });
                          }}
                          placeholder="Description"
                          className="w-full bg-white border border-stone-100 rounded-lg p-3 text-[10px] font-medium resize-none h-20"
                        />
                     </div>
                   ))}
                </div>
              )}

              {selectedSection.type === 'cta' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 block">Action Title</label>
                    <input 
                      value={selectedSection.content.title}
                      onChange={(e) => handleUpdateSectionContent(selectedSection.id, { ...selectedSection.content, title: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 block">Button Label</label>
                    <input 
                      value={selectedSection.content.buttonLabel}
                      onChange={(e) => handleUpdateSectionContent(selectedSection.id, { ...selectedSection.content, buttonLabel: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-6">
                <button 
                  onClick={() => handleRefineContent(selectedSection.id, "Completely polish this section based on the overall site goal, making it more professional and engaging.")}
                  disabled={isRefining}
                  className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-100 hover:bg-emerald-100 transition-all"
                >
                  {isRefining ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Auto-Polish with AI
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Editor Controls */}
      <div className={`w-full lg:w-80 flex-col gap-4 md:gap-6 overflow-y-auto lg:pr-2 custom-scrollbar shrink-0 px-4 md:px-0 flex-1 min-h-0 lg:h-full ${
        activeMobileTab === 'controls' ? 'flex' : 'hidden lg:flex'
      }`}>
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-stone-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-stone-900 flex items-center justify-center text-white">
              <MousePointer2 size={18} />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-serif font-bold text-stone-900 leading-none">Architect</h2>
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Site Builder</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-1">Define Objective</label>
              <div className="relative">
                <textarea 
                  value={siteGoal}
                  onChange={(e) => setSiteGoal(e.target.value)}
                  placeholder="Ex: Elegant portfolio for a minimalist furniture designer..."
                  className="w-full h-24 md:h-28 bg-stone-50 border border-stone-100 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:ring-4 focus:ring-stone-900/5 transition-all text-stone-900 resize-none shadow-inner pr-10"
                />
                {siteGoal && (
                  <button 
                    onClick={() => setSiteGoal('')}
                    className="absolute top-3 right-3 text-stone-300 hover:text-stone-500"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button 
                onClick={handleGenerateFullSite}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-3 py-3 bg-stone-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/20 active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? (
                   <>
                    <Loader2 size={16} className="animate-spin text-amber-400" />
                    Envisioning...
                   </>
                ) : (
                  <>
                    <Sparkles size={16} className="text-amber-400" />
                    Fast Build: Full Site
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-stone-900 uppercase tracking-widest">Custom Aesthetic Profiles</label>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <input 
                      type="color" 
                      value={siteStyle.primaryColor}
                      onChange={(e) => setSiteStyle({...siteStyle, primaryColor: e.target.value})}
                      className="w-4 h-4 rounded-full overflow-hidden border-none cursor-pointer bg-transparent" 
                      title="Custom Primary"
                    />
                    <input 
                      type="color" 
                      value={siteStyle.accentColor}
                      onChange={(e) => setSiteStyle({...siteStyle, accentColor: e.target.value})}
                      className="w-4 h-4 rounded-full overflow-hidden border-none cursor-pointer bg-transparent" 
                      title="Custom Accent"
                    />
                  </div>
                  <button 
                    onClick={() => setEditingTheme({ name: 'My Aesthetic', primary: siteStyle.primaryColor, accent: siteStyle.accentColor })}
                    className="text-stone-300 hover:text-emerald-500 transition-colors p-1"
                    title="Save current colors as Custom Profile"
                  >
                    <Save size={12} />
                  </button>
                  <button 
                    onClick={() => setShowThemeManager(true)}
                    className="text-stone-300 hover:text-stone-900 transition-colors p-1"
                    title="Manage Custom Themes"
                  >
                    <Settings2 size={12} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 p-1 bg-stone-50 rounded-2xl border border-stone-100 max-h-48 overflow-y-auto custom-scrollbar">
                {allThemes.map((theme) => (
                  <div
                    key={theme._id || theme.id}
                    onClick={() => applyTheme(theme)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') applyTheme(theme); }}
                    className={`flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${
                      activeThemeId === (theme._id || theme.id) ? 'bg-white shadow-sm ring-1 ring-stone-200' : 'hover:bg-stone-100/50'
                    }`}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg shrink-0 shadow-inner relative flex items-center justify-center text-white" 
                      style={{ backgroundColor: theme.primary }}
                    >
                      <div className="absolute inset-0 bg-stone-900/10" />
                      {activeThemeId === (theme._id || theme.id) && <Check size={14} className="relative z-10" />}
                      <div 
                         className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm"
                         style={{ backgroundColor: theme.accent }}
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-[11px] font-black uppercase tracking-widest truncate ${activeThemeId === (theme._id || theme.id) ? 'text-stone-900' : 'text-stone-900'}`}>
                        {theme.name || 'Untitled Concept'}
                      </p>
                      <p className="text-[8px] font-mono text-stone-500 truncate lowercase">{theme.font} • {theme.radius}</p>
                    </div>
                    {theme.id?.includes('custom') || theme._id ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); initiateDeleteTheme(theme); }}
                        className="p-1.5 text-stone-300 hover:text-rose-500 transition-colors"
                        title="Exterminate Theme"
                      >
                        <Trash2 size={12} />
                      </button>
                    ) : null}
                  </div>
                ))}
                <button 
                  onClick={() => setEditingTheme({ 
                    name: 'New Theme', 
                    primary: siteStyle.primaryColor, 
                    accent: siteStyle.accentColor, 
                    font: siteStyle.fontFamily, 
                    radius: siteStyle.borderRadius 
                  })}
                  className="p-3 rounded-xl border-2 border-dashed border-stone-200 text-stone-400 hover:border-stone-900 hover:text-stone-900 flex items-center justify-center gap-2 transition-all group"
                >
                  <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Capture Aesthetic</span>
                </button>
              </div>
            </div>

            {/* Rest of the UI remains mostly the same, just removing direct Firestore usage */}
            {/* I will keep the component structure as is but ensure all data flows through state/api */}
            
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Global Aesthetics</label>
                <button 
                  onClick={() => applyTheme(SITE_THEMES[0])}
                  className="text-stone-300 hover:text-stone-900 transition-colors p-1"
                  title="Reset to defaults"
                >
                  <RotateCcw size={12} />
                </button>
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-stone-400 uppercase ml-1">Typography</span>
                <div className="grid grid-cols-4 gap-1">
                  {(['serif', 'sans', 'mono', 'display'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setSiteStyle({...siteStyle, fontFamily: f})}
                      className={`p-2 rounded-lg border text-[10px] font-bold transition-all flex justify-center ${
                        siteStyle.fontFamily === f ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-100 text-stone-400 hover:border-stone-200'
                      }`}
                      title={f}
                    >
                      {f === 'serif' && <Baseline size={14}/>}
                      {f === 'sans' && <Type size={14}/>}
                      {f === 'mono' && <Type size={14} className="italic"/>}
                      {f === 'display' && <Sparkles size={14}/>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-stone-500 uppercase ml-1">Edge Logic</span>
                <div className="flex gap-1 justify-between bg-stone-50 p-1 rounded-xl">
                  {(['none', 'small', 'medium', 'large', 'full'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setSiteStyle({...siteStyle, borderRadius: r})}
                      className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg transition-all ${
                        siteStyle.borderRadius === r ? 'bg-white shadow-sm scale-110' : 'hover:bg-stone-100'
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 md:w-3 md:h-3 bg-stone-300 ${
                        r === 'none' ? 'rounded-none' : 
                        r === 'small' ? 'rounded-sm' : 
                        r === 'medium' ? 'rounded-md' : 
                        r === 'large' ? 'rounded-lg' : 'rounded-full'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>
                <div className="pt-4 border-t border-stone-50">
               <div className="flex items-center justify-between px-1 mb-4">
                 <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Add Elements</label>
               </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'hero', label: 'Headline', icon: Layout, color: 'text-amber-500' },
                    { key: 'features', label: 'USP List', icon: Palette, color: 'text-emerald-500' },
                    { key: 'text', label: 'Text Block', icon: Type, color: 'text-blue-500' },
                    { key: 'image', label: 'Visual', icon: ImageIcon, color: 'text-purple-500' },
                    { key: 'gallery', label: 'Gallery', icon: Layout, color: 'text-pink-500' },
                    { key: 'pricing', label: 'Pricing', icon: ShoppingBag, color: 'text-orange-500' },
                    { key: 'testimonials', label: 'Reviews', icon: Sparkles, color: 'text-yellow-500' },
                    { key: 'cta', label: 'Action', icon: Rocket, color: 'text-rose-500' },
                    { key: 'contact', label: 'Inquiry', icon: Mail, color: 'text-indigo-500' },
                    { key: 'footer', label: 'Foot & Mark', icon: Share2, color: 'text-stone-500' },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      onClick={() => handleGenerateSection(btn.key as any, undefined, true)}
                      disabled={isGenerating}
                      className="w-full px-2 md:px-3 py-2 md:py-3 rounded-2xl bg-stone-50 border border-stone-100 text-stone-500 hover:bg-stone-900 hover:text-white hover:border-stone-900 hover:shadow-lg transition-all flex items-center gap-2 group disabled:opacity-50 active:scale-95"
                      title={`Add ${btn.label} Section`}
                    >
                      <div className={`p-1 bg-white rounded-lg group-hover:bg-stone-800 transition-all shadow-sm shrink-0 ${btn.color}`}>
                        <Plus size={10} />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider truncate">{btn.label}</span>
                    </button>
                  ))}
               </div>
            </div>           </div>
          </div>
        </div>
      </div>

      {/* Preview Canvas */}
      <div className={`flex-1 bg-stone-50 rounded-[2.5rem] md:rounded-[3rem] border border-stone-100 shadow-inner relative overflow-hidden flex-col flex-1 min-h-0 lg:h-full mx-4 md:mx-0 ${
        activeMobileTab === 'preview' ? 'flex' : 'hidden lg:flex'
      }`}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')]"></div>
        
        <div className="p-3 md:p-4 border-b border-stone-100 bg-white/70 backdrop-blur-xl flex items-center justify-between relative z-50">
           <div className="flex items-center gap-2 md:gap-4">
              <div className="hidden sm:flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-stone-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-stone-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-stone-200" />
              </div>
              <div className="hidden sm:block h-6 w-px bg-stone-100" />
              <div className="flex gap-1 px-1.5 h-8 items-center bg-stone-100/40 rounded-xl">
                <button 
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg transition-all ${previewDevice === 'desktop' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-300 hover:text-stone-600'}`}
                  title="Desktop View"
                >
                  <Monitor size={14} />
                </button>
                <button 
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1.5 rounded-lg transition-all ${previewDevice === 'tablet' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-300 hover:text-stone-600'}`}
                  title="Tablet View"
                >
                  <Tablet size={14} /> 
                </button>
                <button 
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg transition-all ${previewDevice === 'mobile' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-300 hover:text-stone-600'}`}
                  title="Mobile View"
                >
                  <Smartphone size={14} />
                </button>
              </div>
              <div className="hidden sm:block h-6 w-px bg-stone-100" />
              <span className="text-[9px] md:text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5 truncate">
                Viewing Masterpiece
              </span>
           </div>
           
           <div className="flex items-center gap-2">
              <div className="flex bg-stone-100 p-1 rounded-xl">
                 <button 
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="p-1.5 text-stone-400 hover:text-stone-900 disabled:opacity-30 transition-all focus:outline-none"
                  title="Undo (Ctrl+Z)"
                >
                  <RotateCcw size={14} className="-scale-x-100" />
                </button>
                <div className="w-px h-4 bg-stone-200 self-center mx-0.5" />
                <button 
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="p-1.5 text-stone-400 hover:text-stone-900 disabled:opacity-30 transition-all focus:outline-none"
                  title="Redo (Ctrl+Y)"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className={`p-2 rounded-xl transition-all ${showActionsMenu ? 'bg-stone-900 text-white shadow-lg' : 'text-stone-400 bg-stone-100 hover:bg-stone-200'}`}
                >
                  <MoreVertical size={18} />
                </button>

                <AnimatePresence>
                  {showActionsMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-white border border-stone-200 rounded-2xl shadow-2xl overflow-hidden z-50 p-2"
                      >
                         <button 
                          onClick={() => { setIsPreviewMode(!isPreviewMode); setShowActionsMenu(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-stone-600 hover:bg-stone-50 rounded-xl transition-colors uppercase tracking-widest"
                        >
                          <Eye size={16} className={isPreviewMode ? 'text-amber-500' : ''} />
                          {isPreviewMode ? 'Exit Preview' : 'Preview Mode'}
                        </button>
                        
                        <button 
                          onClick={() => { setIsFullPreviewOpen(true); setShowActionsMenu(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-stone-600 hover:bg-stone-50 rounded-xl transition-colors uppercase tracking-widest"
                        >
                          <Monitor size={16} />
                          Full Preview
                        </button>

                        <div className="h-px bg-stone-100 my-1 mx-2" />

                        <Link 
                          to="/"
                          target="_blank"
                          onClick={() => setShowActionsMenu(false)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors uppercase tracking-widest"
                        >
                          <Globe size={16} />
                          Live Site
                        </Link>

                        <button 
                          onClick={() => { handleSaveSite(); setShowActionsMenu(false); }}
                          disabled={sections.length === 0}
                          className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-stone-900 hover:bg-stone-50 rounded-xl transition-colors uppercase tracking-widest disabled:opacity-30"
                        >
                          <Save size={16} />
                          Save Design
                        </button>

                        <div className="h-px bg-stone-100 my-1 mx-2" />

                        <button 
                          onClick={() => { clearAll(); setShowActionsMenu(false); }}
                          disabled={sections.length === 0}
                          className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors uppercase tracking-widest disabled:opacity-30"
                        >
                          <Trash2 size={16} />
                          Clear All
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 md:p-8 custom-scrollbar relative z-0 flex justify-center">
          <div 
            style={{ 
              width: previewDevice === 'mobile' ? '375px' : previewDevice === 'tablet' ? '768px' : '100%',
              maxWidth: previewDevice === 'desktop' ? '1000px' : 'none'
            }}
            className={`space-y-4 h-fit min-h-full shrink-0 mx-auto transition-all duration-300 ${previewDevice !== 'desktop' ? 'border-x border-stone-200 bg-white shadow-2xl' : 'max-w-4xl w-full'}`}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {sections.map((section, idx) => (
                  <SortableItem 
                    key={section.id} 
                    idx={idx}
                    section={section} 
                    isPreviewMode={isPreviewMode}
                    removeSection={removeSection}
                    moveSection={moveSection}
                    style={siteStyle}
                    isSelected={selectedSectionId === section.id}
                    onSelect={() => {
                        setSelectedSectionId(section.id);
                        setShowProperties(true);
                    }}
                    isFirst={idx === 0}
                    isLast={idx === sections.length - 1}
                    onRefine={handleRefineContent}
                    isRefining={isRefining}
                  />
                ))}
              </SortableContext>
            </DndContext>
            
            {sections.length > 0 && (
              <div className="pt-20 pb-10 flex flex-col items-center gap-4 opacity-50">
                 <div className="w-12 h-px bg-stone-200" />
                 <div className="flex items-center gap-2 grayscale brightness-50">
                    <Rocket size={16} className="text-stone-400" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-stone-400">Built with Page Pilot CMS</span>
                 </div>
              </div>
            )}
            
            {sections.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 opacity-20 italic">
                <MousePointer2 size={48} className="mb-4" />
                <p className="font-serif">The canvas awaits your vision.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Theme Manager Modal */}
      <AnimatePresence>
        {showThemeManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowThemeManager(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[80vh]"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Palette size={18} />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-stone-900">Design Profiles</h3>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Library</p>
                  </div>
                </div>
                <button onClick={() => setShowThemeManager(false)} className="p-2 hover:bg-stone-100 rounded-xl text-stone-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-stone-50/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customThemes.map((theme) => (
                    <div key={theme._id || theme.id} className="bg-white p-5 rounded-[1.5rem] border border-stone-100 shadow-sm hover:shadow-md transition-shadow group relative">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-stone-900">{theme.name}</h4>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => {
                               setSiteStyle({
                                 primaryColor: theme.primary,
                                 accentColor: theme.accent,
                                 fontFamily: theme.font as 'serif' | 'sans' | 'mono' | 'display',
                                 borderRadius: theme.radius as 'none' | 'small' | 'medium' | 'large' | 'full'
                               });
                               setActiveThemeId(theme.id || theme._id || '');
                               setShowThemeManager(false);
                               toast('Theme Applied', `Switched to ${theme.name}`, 'success');
                             }}
                             className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                             title="Apply Theme"
                           >
                             <Check size={14} />
                           </button>
                           {user && (
                             <button 
                               onClick={() => initiateDeleteTheme(theme)}
                               className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                               title="Delete Theme"
                             >
                               <Trash2 size={14} />
                             </button>
                           )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="flex gap-2">
                           <div className="w-8 h-8 rounded-full border border-stone-200" style={{ backgroundColor: theme.primary }} title="Primary" />
                           <div className="w-8 h-8 rounded-full border border-stone-200" style={{ backgroundColor: theme.accent }} title="Accent" />
                         </div>
                         <div className="h-4 w-px bg-stone-200" />
                         <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{theme.font}</span>
                         <div className="h-4 w-px bg-stone-200" />
                         <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{theme.radius} radius</span>
                      </div>
                    </div>
                  ))}
                  {customThemes.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-stone-400">
                       <Palette size={32} className="mb-4 opacity-50" />
                       <p className="text-sm font-medium">No custom design profiles saved yet.</p>
                       <p className="text-xs mt-1 opacity-70">Save your current styles to build a library.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Preview Modal */}
      <AnimatePresence>
        {isFullPreviewOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col"
          >
            <div className="h-16 px-8 border-b border-stone-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-white">
                  <Rocket size={16} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-stone-900">Live Preview</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-stone-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setPreviewDevice('desktop')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${previewDevice === 'desktop' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      Desktop
                    </button>
                    <button 
                      onClick={() => setPreviewDevice('tablet')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${previewDevice === 'tablet' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      Tablet
                    </button>
                    <button 
                      onClick={() => setPreviewDevice('mobile')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${previewDevice === 'mobile' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      Mobile
                    </button>
                </div>
                <button 
                  onClick={() => setIsFullPreviewOpen(false)}
                  className="p-2.5 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-500 transition-all font-bold"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-stone-50 flex justify-center p-8 custom-scrollbar">
               <motion.div 
                 animate={{ 
                   width: previewDevice === 'mobile' ? 375 : previewDevice === 'tablet' ? 768 : '100%',
                   maxWidth: previewDevice === 'desktop' ? '1200px' : 'none'
                 }}
                 className="bg-white shadow-2xl min-h-full h-fit flex flex-col"
               >
                 <DndContext sensors={sensors} collisionDetection={closestCenter}>
                    <SortableContext items={sections.map(s => `${s.id}-preview`)} strategy={verticalListSortingStrategy}>
                      {sections.map((section, idx) => (
                         <SortableItem 
                           key={`${section.id}-preview`}
                           idx={idx}
                           section={section}
                           isPreviewMode={true}
                           removeSection={() => {}}
                           moveSection={() => {}}
                           style={siteStyle}
                           isSelected={false}
                           onSelect={() => {}}
                           isFirst={idx === 0}
                           isLast={idx === sections.length - 1}
                           onRefine={() => {}}
                           isRefining={false}
                         />
                      ))}
                    </SortableContext>
                  </DndContext>
                 {sections.length === 0 && (
                   <div className="flex-1 flex flex-col items-center justify-center py-64 opacity-20">
                      <Layout size={48} className="mb-4" />
                      <p className="font-serif italic text-xl">The canvas is blank.</p>
                   </div>
                 )}
               </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingTheme && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setEditingTheme(null)}
               className="absolute inset-0 bg-stone-950/80 backdrop-blur-md"
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl relative p-8"
             >
                <h3 className="text-xl font-serif font-bold text-stone-900 mb-6">Capture Aesthetic</h3>
                <form onSubmit={handleSaveTheme} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-stone-900 uppercase tracking-widest pl-1">Aesthetic Name</label>
                      <input 
                        required
                        autoFocus
                        value={editingTheme.name}
                        onChange={(e) => setEditingTheme({...editingTheme, name: e.target.value})}
                        className="w-full bg-stone-50 border border-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-stone-900/5 transition-all"
                        placeholder="Ex: Desert Bloom"
                      />
                   </div>
                   <div className="flex gap-4">
                       <div className="flex-1 p-4 bg-stone-50 rounded-2xl border border-stone-100 flex flex-col items-center gap-2">
                          <label className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Primary Color</label>
                          <input 
                            type="color"
                            value={editingTheme.primary || siteStyle.primaryColor}
                            onChange={(e) => setEditingTheme({...editingTheme, primary: e.target.value})}
                            className="w-10 h-10 cursor-pointer rounded-lg border-2 border-stone-200 shadow-sm"
                          />
                          <span className="text-[10px] font-mono font-bold text-stone-600 uppercase">{editingTheme.primary || siteStyle.primaryColor}</span>
                       </div>
                       <div className="flex-1 p-4 bg-stone-50 rounded-2xl border border-stone-100 flex flex-col items-center gap-2">
                          <label className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Accent Color</label>
                          <input 
                            type="color"
                            value={editingTheme.accent || siteStyle.accentColor}
                            onChange={(e) => setEditingTheme({...editingTheme, accent: e.target.value})}
                            className="w-10 h-10 cursor-pointer rounded-lg border-2 border-stone-200 shadow-sm"
                          />
                          <span className="text-[10px] font-mono font-bold text-stone-600 uppercase">{editingTheme.accent || siteStyle.accentColor}</span>
                       </div>
                    </div>
                    <button 
                      type="submit"
                      className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/10 active:scale-95"
                    >
                      COMMIT TO VAULT
                    </button>
                </form>
             </motion.div>
           </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteThemeModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteThemeModal(false)}
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
                  <h3 className="text-xl font-serif font-bold text-stone-900">Purge Aesthetic</h3>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Permanent Removal</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-stone-600 leading-relaxed">
                  Are you certain you wish to let the custom aesthetic profile <span className="font-bold text-stone-900">{themeToDelete?.name || 'Untitled Aesthetic'}</span> fade from the workshop record?
                  This will permanently delete this design concept.
                </p>
                <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50">
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest leading-tight">
                    Absolute: This action is final. The aesthetic profile will be erased immediately.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmDeleteTheme}
                  disabled={isDeletingTheme}
                  className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/20 active:scale-95 disabled:opacity-50"
                >
                  {isDeletingTheme ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Confirm Purging'}
                </button>
                <button
                  onClick={() => setShowDeleteThemeModal(false)}
                  className="px-6 bg-stone-100 text-stone-500 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-stone-200 transition-all font-display"
                >
                  Hold
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveModal(false)}
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Save size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-stone-900">Save Design</h3>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Commit Blueprint</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-stone-600 leading-relaxed">
                  Are you ready to commit this design to the secure vault? This will make the current layout your finalized blueprint.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmSaveSite}
                  disabled={isSavingSite}
                  className="flex-1 bg-amber-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-amber-700 transition-all shadow-xl shadow-amber-900/20 active:scale-95 disabled:opacity-50"
                >
                  {isSavingSite ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Commit Design'}
                </button>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-6 bg-stone-100 text-stone-500 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-stone-200 transition-all font-display"
                >
                  Hold
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear All Modal */}
      <AnimatePresence>
        {showClearModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearModal(false)}
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
                  <h3 className="text-xl font-serif font-bold text-stone-900">Erase Blueprint</h3>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Clear All Layers</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-stone-600 leading-relaxed">
                  Are you certain you wish to erase all constructed layers? This will wipe the canvas completely.
                </p>
                <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50">
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest leading-tight">
                    Absolute: This action is final.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmClearAll}
                  className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/20 active:scale-95"
                >
                  Erase Layers
                </button>
                <button
                  onClick={() => setShowClearModal(false)}
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
