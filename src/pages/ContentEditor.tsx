/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import React from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Sparkles, 
  Save, 
  Trash2, 
  Eye, 
  Globe, 
  Image as ImageIcon,
  Type,
  ChevronDown,
  Wand2,
  ArrowLeft,
  X,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Eraser,
  Undo,
  Redo,
  Strikethrough,
  Minus,
  FileText,
  PanelRight,
  Loader2,
  Video,
  Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactQuill from 'react-quill-new';
import { geminiService } from '../services/geminiService';

const AI_TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'conversational', label: 'Conversational' },
  { id: 'technical', label: 'Technical' },
  { id: 'inspirational', label: 'Inspirational' },
  { id: 'bold', label: 'Bold' },
  { id: 'minimalist', label: 'Minimalist' },
];

export default function ContentEditor() {
  const { profile, user } = useAuth();
  const role = profile?.role || 'author';
  const isAdminOrEditor = role === 'admin' || role === 'editor';
  
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [gallery, setGallery] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showSplitPreview, setShowSplitPreview] = useState(true);
  const [showMediaInsertModal, setShowMediaInsertModal] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'content' | 'featured'>('content');
  const [externalImageUrl, setExternalImageUrl] = useState('');
  const [activeFormats, setActiveFormats] = useState<any>({});
  const quillRef = React.useRef<ReactQuill>(null);
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
  const saveHandlerRef = React.useRef<() => void>(() => {});
  const createPostHandlerRef = React.useRef<() => void>(() => {});

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('draft');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [featuredImage, setFeaturedImage] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  // Auto-save state
  const [lastSavedData, setLastSavedData] = useState<string>('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  // Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // Update refs to latest handlers to avoid stale closures in event listener
  useEffect(() => {
    saveHandlerRef.current = () => handleSave();
    createPostHandlerRef.current = () => handleCreatePost();
  });

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      
      // Ctrl/Cmd + S to Save
      if (isMod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveHandlerRef.current();
      }
      
      // Ctrl/Cmd + N to Create New Post
      if (isMod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createPostHandlerRef.current();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const fetchPosts = async () => {
    try {
      const data = await api.posts.list();
      setPosts(data);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    }
  };

  const fetchMedia = async () => {
    try {
      const data = await api.media.list();
      setGallery(data);
    } catch (err) {
      console.error('Failed to fetch media:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchMedia();
    const interval = setInterval(fetchPosts, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleCreatePost = async () => {
    if (!user) return;
    try {
      const newPost = {
        title: 'Untitled Post',
        slug: 'untitled-' + Math.random().toString(36).substring(7),
        content: '',
        status: 'draft',
        authorId: user.uid,
        category: '',
        excerpt: '',
        tags: [],
        featuredImage: '',
        seoTitle: '',
        seoDescription: '',
        views: 0,
        secondsSpent: 0
      };
      const createdPost = await api.posts.create(newPost);
      fetchPosts();
      handleSelectPost(createdPost);
    } catch (err) {
      console.error('Failed to create post:', err);
    }
  };

  const handleDeletePost = (postId: string) => {
    setPostToDelete(postId);
    setShowDeleteModal(true);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    setIsDeleting(true);
    try {
      await api.posts.delete(postToDelete);
      fetchPosts();
      if ((selectedPost?._id === postToDelete) || (selectedPost?.id === postToDelete)) {
        setIsEditing(false);
        setSelectedPost(null);
        setTitle('');
        setContent('');
        setSlug('');
      }
      setShowDeleteModal(false);
      setPostToDelete(null);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmPurge = () => {
    setTitle('');
    setContent('');
    setCategory('');
    setTags([]);
    setExcerpt('');
    setFeaturedImage('');
    setSlug('');
    setSeoTitle('');
    setSeoDescription('');
    if (quillRef.current) {
      quillRef.current.getEditor().setContents([]);
    }
    setShowPurgeModal(false);
  };

  const confirmAddTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newTagInput.trim()) {
      const trimmedTag = newTagInput.trim();
      if (!tags.includes(trimmedTag)) {
        setTags(prev => [...prev, trimmedTag]);
      }
    }
    setShowTagModal(false);
    setNewTagInput('');
  };

  const handleSelectPost = (post: any) => {
    setSelectedPost(post);
    setTitle(post.title || '');
    setContent(post.content || '');
    setSlug(post.slug || '');
    setStatus(post.status || 'draft');
    setCategory(post.category || '');
    setTags(post.tags || []);
    setFeaturedImage(post.featuredImage || '');
    setExcerpt(post.excerpt || '');
    setSeoTitle(post.seoTitle || '');
    setSeoDescription(post.seoDescription || '');
    setIsEditing(true);
    setShowPublishConfirm(false);
    setAutoSaveStatus('idle');
    setLastSavedData(JSON.stringify({ 
      title: post.title || '', 
      content: post.content || '', 
      slug: post.slug || '', 
      status: post.status || 'draft', 
      category: post.category || '', 
      featuredImage: post.featuredImage || '', 
      excerpt: post.excerpt || '', 
      seoTitle: post.seoTitle || '', 
      seoDescription: post.seoDescription || '' 
    }));
    
    // Clear active formats on new post selection
    setActiveFormats({});
  };

  const handleSave = async (forcePublish = false) => {
    if (!selectedPost) return;

    const actualId = selectedPost._id || selectedPost.id;

    if (status === 'published' && !forcePublish && selectedPost.status !== 'published') {
      setShowPublishConfirm(true);
      return;
    }

    setLoading(true);
    try {
      const isNewlyPublished = status === 'published' && selectedPost.status !== 'published';
      
      const updatedPost = await api.posts.update(actualId, {
        title,
        content,
        slug: slug || title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
        status,
        category,
        tags,
        featuredImage,
        excerpt,
        seoTitle,
        seoDescription,
      });

      if (isNewlyPublished && user) {
        await notificationService.createNotification({
          userId: selectedPost.authorId,
          title: 'Article Published!',
          message: `Your article "${title}" is now live on the site.`,
          type: 'publication',
          link: `/content`
        });

        // Notify admins
        await notificationService.notifyAdmins({
          title: 'New Publication',
          message: `${profile?.displayName || user.email} just published "${title}".`,
          type: 'publication',
          link: `/content`
        });
      }

      setLastSavedData(JSON.stringify({ title, content, slug, status, category, tags, featuredImage, excerpt, seoTitle, seoDescription }));
      setLastSavedTime(new Date());
      setAutoSaveStatus('saved');
      fetchPosts();
    } catch (error) {
      console.error('Save failed:', error);
      setAutoSaveStatus('error');
    } finally {
      setLoading(false);
      setShowPublishConfirm(false);
    }
  };

  // Auto-save Effect
  useEffect(() => {
    if (!selectedPost || !isEditing) return;

    const currentData = JSON.stringify({ title, content, slug, status, category, tags, featuredImage, excerpt, seoTitle, seoDescription });
    
    if (!lastSavedData) {
      setLastSavedData(currentData);
      return;
    }

    if (currentData === lastSavedData) return;

    const timer = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        const actualId = selectedPost._id || selectedPost.id;
        await api.posts.update(actualId, {
          title,
          content,
          slug: slug || title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
          status,
          category,
          tags,
          featuredImage,
          excerpt,
          seoTitle,
          seoDescription,
        });
        setLastSavedData(currentData);
        setLastSavedTime(new Date());
        setAutoSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save failed:', err);
        setAutoSaveStatus('error');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [title, content, slug, status, category, featuredImage, excerpt, seoTitle, seoDescription, selectedPost, lastSavedData, isEditing]);

  const handleGenerateAI = async () => {
    if (!title) return alert('Enter a title first');
    setAiLoading(true);
    try {
      const prompt = `
        Title: "${title}"
        Tone: ${aiTone}
        Target Audience: ${aiAudience}
        ${aiExtraContext ? `Context: ${aiExtraContext}` : ''}
        
        Write a comprehensive, professional blog post in HTML format. 
        Include:
        - A compelling introduction
        - Well-structured sections with clear <h2> and <h3> subheadings
        - Engaging, authoritative content tailored for the ${aiAudience} audience
        - A powerful conclusion with advice or next steps
        - Ensure rhythmic sentence variety and high readability
        - DO NOT include <html>, <body> or <head> tags. Just the content.
      `.trim();

      const systemInstruction = `You are a world-class content strategist and professional copywriter with expertise in ${aiTone} delivery. Your goal is to create impactful, SEO-optimized blog content that deeply resonates with a ${aiAudience} audience. Use professional HTML tags for formatting.`;

      const generated = await geminiService.generateContent(prompt, systemInstruction);
      setContent(generated);
      setShowAiGeneratorModal(false);
      notificationService.createNotification({
        userId: user?.uid || '',
        title: 'Content Generated',
        message: 'AI has finished crafting your article.',
        type: 'system'
      });
    } catch (err: any) {
      console.error('AI Generation Error:', err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
        notificationService.createNotification({
          userId: user?.uid || '',
          title: 'AI Quota Exhausted',
          message: 'Your AI provider has reached its usage limit (429). Please wait for the quota to reset.',
          type: 'error'
        });
        alert('AI Quota Exhausted: Your current plan has reached its limits. Please try again later.');
      } else {
        alert('AI generation failed: ' + (err.message || 'Unknown error'));
      }
    }
    setAiLoading(false);
  };

  const handleRewriteSection = async (forcedTone?: string) => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();

    if (!range || range.length === 0) {
      alert('Please select the text you want to rewrite.');
      return;
    }

    const selectedText = quill.getText(range.index, range.length);

    if (!selectedText || selectedText.trim().length < 5) {
      alert('Selection too short. Please select the section you want to rewrite.');
      return;
    }

    setAiLoading(true);
    try {
      const toneToUse = forcedTone || aiTone;
      const rewritten = await geminiService.rewriteText(selectedText, toneToUse);
      quill.deleteText(range.index, range.length);
      quill.insertText(range.index, rewritten);
      
      // Update state since direct Quill calls might not trigger onChange immediately
      setContent(quill.root.innerHTML);
      
      // Select the rewritten text
      setTimeout(() => {
        quill.setSelection(range.index, rewritten.length);
      }, 50);

      notificationService.createNotification({
        userId: user?.uid || '',
        title: 'Content Rewritten',
        message: 'AI has successfully polished the selected section.',
        type: 'system'
      });
    } catch (err: any) {
      console.error('Rewrite Error:', err);
      alert('Rewrite failed: ' + (err.message || 'AI service error'));
    } finally {
      setAiLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!content) return alert('Enter some content first');
    setAiLoading(true);
    try {
      const summary = await geminiService.summarizeContent(content);
      setExcerpt(summary);
    } catch (err: any) {
      console.error('Summarization Error:', err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
        alert('AI Quota Exhausted: Could not summarize at this time.');
      } else {
        alert('Summarization failed');
      }
    }
    setAiLoading(false);
  };

  const handleSEO = async () => {
    if (!content) return alert('Enter some content first');
    setAiLoading(true);
    try {
      const seoJson = await geminiService.optimizeSEO(title, content);
      
      try {
        const seoData = JSON.parse(seoJson);
        setSeoTitle(seoData.metaTitle || seoData.title || '');
        setSeoDescription(seoData.metaDescription || seoData.description || '');
      } catch (parseErr) {
        console.error('Failed to parse SEO JSON:', parseErr, seoJson);
        alert('SEO Suggestion:\n' + seoJson);
      }
    } catch (err: any) {
      console.error('SEO Error:', err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
        alert('AI Quota Exhausted: SEO optimization unavailable right now.');
      } else {
        alert('SEO optimization failed');
      }
    }
    setAiLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setLoading(true);
    setUploadProgress(10);
    
    const filesArray = Array.from(files);

    for (const file of filesArray) {
      try {
        await api.media.upload(file);
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
        alert(`Failed to upload ${file.name}`);
      }
    }

    setLoading(false);
    setUploadProgress(null);
    e.target.value = '';
    fetchMedia();
  };

  const [imagePrompt, setImagePrompt] = useState('');
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [imageStyle, setImageStyle] = useState('minimalist');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

   // Detailed AI Content State
  const [showDotsMenu, setShowDotsMenu] = useState(false);
  const [showAiGeneratorModal, setShowAiGeneratorModal] = useState(false);
  const [showToneDropdown, setShowToneDropdown] = useState(false);
  const [aiTone, setAiTone] = useState('professional');
  const [aiAudience, setAiAudience] = useState('general');
  const [aiExtraContext, setAiExtraContext] = useState('');

  const stylePresets = [
    { id: 'minimalist', label: 'Minimalist', color: 'bg-stone-100' },
    { id: 'cinematic', label: 'Cinematic', color: 'bg-slate-800' },
    { id: 'abstract', label: 'Abstract', color: 'bg-indigo-100' },
    { id: 'digital-art', label: 'Digital Art', color: 'bg-emerald-500/20' },
    { id: 'nature', label: 'Nature', color: 'bg-green-100' },
  ];

  const handleAiImageGen = async () => {
    if (!imagePrompt || !user) return;
    setAiLoading(true);
    setGeneratedImage(null);
    try {
      const fullPrompt = `${imagePrompt}, ${imageStyle} style, high quality, professional lighting, artisan aesthetic`;
      const base64Image = await geminiService.generateImage(fullPrompt);
      setGeneratedImage(base64Image);
      
      const res = await fetch(base64Image);
      const blob = await res.blob();
      const file = new File([blob], `ai-gen-${Date.now()}.png`, { type: 'image/png' });

      const uploadedMedia = await api.media.upload(file);
      
      if (selectedPost) {
        setFeaturedImage(uploadedMedia.url);
      }
      
      fetchMedia();
    } catch (err: any) {
      console.error('Image Gen Error:', err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
        alert('AI Quota Exhausted: Image generation is currently unavailable.');
      } else {
        alert('Image generation failed');
      }
    }
    setAiLoading(false);
  };

  const insertFormatting = (format: string, value: any = true) => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    
    if (format === 'link') {
      const url = window.prompt('Enter URL:', 'https://');
      if (url) {
        quill.format('link', url);
      }
      return;
    }

    if (format === 'clean') {
      quill.removeFormat(quill.getSelection()?.index || 0, quill.getSelection()?.length || 0);
      return;
    }

    if (format === 'undo') {
      quill.history.undo();
      return;
    }

    if (format === 'redo') {
      quill.history.redo();
      return;
    }

    const currentFormat = quill.getFormat();
    
    if (format.startsWith('header')) {
      const level = parseInt(format.split('-')[1]);
      quill.format('header', currentFormat.header === level ? false : level);
    } else if (format === 'list') {
      quill.format('list', currentFormat.list === value ? false : value);
    } else if (format === 'blockquote') {
      quill.format('blockquote', !currentFormat.blockquote);
    } else if (format === 'code-block') {
      quill.format('code-block', !currentFormat['code-block']);
    } else {
      quill.format(format, !currentFormat[format]);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-8 pb-12">
      {/* Delete Post Modal */}
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
              className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-[2.5rem] shadow-2xl overflow-hidden p-8 border border-stone-100 dark:border-stone-800"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Trash2 size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-white">Vanish Article</h3>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Permanent Deletion</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Are you certain you wish to delete this article? 
                  This will permanently erase the content and it cannot be recovered.
                </p>
                <div className="p-4 bg-rose-50/50 dark:bg-rose-900/10 rounded-2xl border border-rose-100/50 dark:border-rose-900/30">
                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest leading-tight">
                    Absolute: This action is final.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmDeletePost}
                  disabled={isDeleting}
                  className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/20 active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Confirm Deletion'}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-stone-200 dark:hover:bg-stone-700 transition-all font-display"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Purge Modal */}
      <AnimatePresence>
        {showPurgeModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPurgeModal(false)}
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-[2.5rem] shadow-2xl overflow-hidden p-8 border border-stone-100 dark:border-stone-800"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Eraser size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-white">Purge Content</h3>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Clear Editor</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Are you sure you want to clear the entire editor? This will wipe the title, all fields, and content text.
                </p>
                <div className="p-4 bg-rose-50/50 dark:bg-rose-900/10 rounded-2xl border border-rose-100/50 dark:border-rose-900/30">
                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest leading-tight">
                    Any unsaved changes will be lost immediately.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmPurge}
                  className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/20 active:scale-95"
                >
                  Confirm Purge
                </button>
                <button
                  onClick={() => setShowPurgeModal(false)}
                  className="px-6 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-stone-200 dark:hover:bg-stone-700 transition-all font-display"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tag Modal */}
      <AnimatePresence>
        {showTagModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTagModal(false)}
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-[2.5rem] shadow-2xl overflow-hidden p-8 border border-stone-100 dark:border-stone-800"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 flex items-center justify-center">
                  <Plus size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-white">Add Special Tag</h3>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Metadata Label</p>
                </div>
              </div>

              <form onSubmit={confirmAddTag} className="space-y-4 mb-8">
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Enter a new tag to help categorize and filter this article.
                </p>
                <div>
                   <input
                     autoFocus
                     type="text"
                     value={newTagInput}
                     onChange={(e) => setNewTagInput(e.target.value)}
                     placeholder="e.g. Featured, Announcement, Editorial..."
                     className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-stone-900 dark:text-white font-medium"
                   />
                </div>
              </form>

              <div className="flex gap-3">
                <button
                  onClick={confirmAddTag}
                  disabled={!newTagInput.trim()}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 active:scale-95 disabled:opacity-50"
                >
                  Add Tag
                </button>
                <button
                  onClick={() => setShowTagModal(false)}
                  className="px-6 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-stone-200 dark:hover:bg-stone-700 transition-all font-display"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Generator Modal */}
      <AnimatePresence>
        {showAiGeneratorModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-stone-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-stone-100 dark:border-stone-800"
            >
              <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                    <Wand2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-stone-900 dark:text-white text-lg">AI Content Sculptor</h3>
                    <p className="text-[11px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest">Advanced Generation</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAiGeneratorModal(false)}
                  className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-400 dark:text-stone-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2 block">Voice & Tone</label>
                    <select 
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl px-4 py-3 text-sm text-stone-600 dark:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {AI_TONES.map(tone => (
                        <option key={tone.id} value={tone.id}>{tone.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2 block">Target Audience</label>
                    <select 
                      value={aiAudience}
                      onChange={(e) => setAiAudience(e.target.value)}
                      className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl px-4 py-3 text-sm text-stone-600 dark:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="general">General Public</option>
                      <option value="experts">Industry Experts</option>
                      <option value="beginners">Beginners</option>
                      <option value="executives">Decision Makers</option>
                      <option value="creatives">Creatives / Artists</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2 block">Additional Context (Optional)</label>
                  <textarea 
                    value={aiExtraContext}
                    onChange={(e) => setAiExtraContext(e.target.value)}
                    placeholder="Specific points you want to cover, unique perspectives, or background info..."
                    className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 text-sm text-stone-600 dark:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[120px] resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleGenerateAI}
                    disabled={aiLoading}
                    className="w-full bg-stone-900 dark:bg-emerald-600 text-white py-4 rounded-2xl font-bold text-sm tracking-widest flex items-center justify-center gap-3 hover:bg-stone-800 dark:hover:bg-emerald-500 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/10"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin text-emerald-100" />
                        SCULPTING CONTENT...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} className="text-emerald-100" />
                        GENERATE MASTERPIECE
                      </>
                    )}
                  </button>
                  <p className="text-center mt-4 text-[11px] text-stone-400 dark:text-stone-600 leading-relaxed italic">
                    AI will use your title "{title}" as the primary anchor.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-stone-900/40 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-stone-900 w-full max-w-4xl h-full max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-stone-100 dark:border-stone-800"
            >
              <div className="p-4 md:p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Eye size={16} />
                  </div>
                  <h3 className="font-serif font-bold text-stone-900 dark:text-white">Live Preview</h3>
                </div>
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-400 dark:text-stone-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {featuredImage && (
                  <div className="w-full aspect-[21/9] overflow-hidden">
                    <img src={featuredImage} alt={title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                )}
                
                <div className="max-w-3xl mx-auto px-6 py-12 md:py-20 font-sans">
                  <div className="mb-12">
                    {category && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-4 block">
                        {category}
                      </span>
                    )}
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-stone-900 dark:text-white leading-tight mb-6">
                      {title || 'Untitled Post'}
                    </h1>
                    <div className="flex items-center gap-4 text-stone-400 dark:text-stone-500 text-sm">
                       <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 overflow-hidden">
                         {profile?.photoURL ? <img src={profile.photoURL} referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : null}
                       </div>
                       <span className="font-medium">By {profile?.displayName || user?.email?.split('@')[0] || 'Writer'}</span>
                       <span className="w-1 h-1 bg-stone-200 dark:bg-stone-800 rounded-full"></span>
                       <span>{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>

                  <div className="prose prose-stone prose-lg dark:prose-invert max-w-none prose-headings:font-serif prose-headings:font-bold prose-p:text-stone-600 dark:prose-p:text-stone-400 prose-p:leading-relaxed prose-img:rounded-3xl">
                    <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: content }} />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Posts List */}
      <div className={`${isEditing ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm flex-col overflow-hidden max-h-[400px] lg:max-h-none transition-colors`}>
        <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <h2 className="font-serif font-bold text-stone-900 dark:text-white">Articles</h2>
          <button 
            onClick={handleCreatePost}
            className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
            title="Create New Post (Ctrl+N)"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-stone-400 dark:text-stone-600" size={16} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..." 
              className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 rounded-xl pl-10 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto divide-y divide-stone-50 dark:divide-stone-800">
          {posts.filter(p => p.title?.toLowerCase().includes(searchQuery.toLowerCase())).map((post) => (
              <div key={post._id || post.id} onClick={() => handleSelectPost(post)} className={`p-4 cursor-pointer transition-colors group/item ${selectedPost?._id === post._id || selectedPost?.id === post.id ? 'bg-emerald-50 dark:bg-emerald-900/10 border-l-4 border-l-emerald-500' : 'hover:bg-stone-50 dark:hover:bg-stone-800'}`}>
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white line-clamp-1 mb-1 flex-1">{post.title}</h3>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeletePost(post._id || post.id); }}
                    className="p-1 text-stone-300 dark:text-stone-700 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-all rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    title="Delete Post"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${post.status === 'published' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-500'}`}>
                    {post.status.toUpperCase()}
                  </span>
                <span className="text-[10px] text-stone-400 dark:text-stone-600">
                  {post.updatedAt || post.createdAt ? new Date(post.updatedAt || post.createdAt).toLocaleDateString() : 'Just now'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor Area */}
      <div className={`${!isEditing ? 'hidden lg:flex' : 'flex'} flex-1 flex flex-col gap-6`}>
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div 
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col gap-6"
            >
              {/* Back button for mobile */}
              <button 
                onClick={() => setIsEditing(false)}
                className="lg:hidden flex items-center gap-2 text-stone-500 dark:text-stone-400 text-sm font-medium mb-2"
              >
                <ArrowLeft size={16} /> Back to List
              </button>

              <div className="bg-white dark:bg-stone-900 p-4 md:p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                   <div className="p-2.5 bg-stone-100 dark:bg-stone-800 rounded-2xl text-stone-400 dark:text-stone-600 shrink-0">
                      <FileText size={20} />
                   </div>
                    <div className="flex-1 relative flex items-center gap-2">
                     <div className="flex-1">
                        <input 
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="text-lg md:text-xl font-serif font-bold text-stone-900 dark:text-white focus:outline-none bg-transparent placeholder:text-stone-300 dark:placeholder:text-stone-700 w-full" 
                          placeholder="Article Title"
                        />
                        <input 
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest focus:outline-none bg-transparent placeholder:text-stone-300 dark:placeholder:text-stone-700 w-full" 
                          placeholder="Category (e.g. Sculpture)"
                        />
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tags.map((tag, idx) => (
                              <span key={idx} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[9px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest group/tag hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
                                {tag}
                                <button 
                                  onClick={() => setTags(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-stone-300 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                                >
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                     </div>
                    <div className="flex items-center gap-0.5">
                      {isAdminOrEditor && (
                        <button 
                          onClick={() => setShowAiGeneratorModal(true)}
                          disabled={aiLoading}
                          className="p-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors disabled:opacity-50"
                          title="AI Content Generator"
                        >
                          <Wand2 size={18} />
                        </button>
                      )}
                      
                      <div className="relative">
                        <button 
                          onClick={() => setShowDotsMenu(!showDotsMenu)}
                          className="p-2 text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 transition-colors"
                        >
                          <MoreVertical size={18} />
                        </button>
                        
                        <AnimatePresence>
                          {showDotsMenu && (
                            <>
                              <div className="fixed inset-0 z-[90]" onClick={() => setShowDotsMenu(false)} />
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl py-3 z-[100]"
                              >
                                <div className="px-5 pb-2 mb-2 border-b border-stone-100 dark:border-stone-800">
                                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Master Controls</span>
                                </div>
                                <button 
                                  onClick={() => {
                                    setShowDotsMenu(false);
                                    // Focus category input
                                    const catInput = document.querySelector('input[placeholder="Category (e.g. Sculpture)"]') as HTMLInputElement;
                                    catInput?.focus();
                                  }}
                                  className="w-full px-5 py-2.5 text-left text-[11px] font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-3 uppercase tracking-widest transition-colors"
                                >
                                  <Type size={14} className="text-emerald-500" /> Configure Category
                                </button>
                                <button 
                                  onClick={() => {
                                    setShowDotsMenu(false);
                                    setShowTagModal(true);
                                  }}
                                  className="w-full px-5 py-2.5 text-left text-[11px] font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-3 uppercase tracking-widest transition-colors"
                                >
                                  <Plus size={14} className="text-blue-500" /> Add Special Tag
                                </button>
                                <div className="my-2 border-t border-stone-100 dark:border-stone-800"></div>
                                {selectedPost && (
                                  <button 
                                    onClick={async () => {
                                      setShowDotsMenu(false);
                                      const postId = selectedPost._id || selectedPost.id;
                                      if (postId) {
                                        await handleDeletePost(postId);
                                      }
                                    }}
                                    className="w-full px-5 py-2.5 text-left text-[11px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-3 uppercase tracking-widest transition-colors"
                                  >
                                    <Trash2 size={14} /> Delete Current
                                  </button>
                                )}
                                <button 
                                  onClick={() => {
                                    setShowDotsMenu(false);
                                    setShowPurgeModal(true);
                                  }}
                                  className="w-full px-5 py-2.5 text-left text-[11px] font-bold text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 flex items-center gap-3 uppercase tracking-widest transition-colors"
                                >
                                  <Eraser size={14} /> Purge All Content
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Status</span>
                    <select 
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={!isAdminOrEditor}
                      className="bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2 text-xs md:text-sm font-bold text-stone-700 dark:text-stone-300 focus:outline-none disabled:opacity-50 transition-all cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-900"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                  
                  <div className="h-6 w-px bg-stone-200 dark:bg-stone-800 mx-1 hidden md:block"></div>

                  <button 
                    onClick={() => setIsPreviewOpen(true)}
                    className="p-2.5 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                    title="Preview Article"
                  >
                    <Eye size={18} />
                  </button>
                  
                  <div className="relative groupAction">
                    <div className="flex items-center">
                      <button 
                        onClick={() => handleSave()}
                        disabled={loading}
                        className="bg-stone-900 dark:bg-emerald-600 text-white px-6 md:px-8 py-2.5 rounded-xl text-xs md:text-sm font-bold tracking-widest uppercase flex items-center gap-3 hover:bg-stone-800 dark:hover:bg-emerald-500 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/10"
                        title="Save Changes (Ctrl+S)"
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                        {loading ? 'Saving...' : 'Save Work'}
                      </button>

                    {/* Auto-save Status indicator */}
                    <div className="absolute top-full mt-2 right-0 flex items-center gap-2 pointer-events-none">
                      <AnimatePresence mode="wait">
                        {autoSaveStatus === 'saving' && (
                          <motion.div 
                            key="auto-saving"
                            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                            className="flex items-center gap-1.5 text-[10px] text-stone-400 font-bold uppercase tracking-widest"
                          >
                            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                            Auto-Saving...
                          </motion.div>
                        )}
                        {autoSaveStatus === 'saved' && (
                          <motion.div 
                            key="auto-saved"
                            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                            className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold uppercase tracking-widest"
                          >
                            <Save size={10} />
                            Draft Saved {lastSavedTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </motion.div>
                        )}
                        {autoSaveStatus === 'error' && (
                          <motion.div 
                            key="auto-error"
                            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                            className="flex items-center gap-1.5 text-[10px] text-rose-500 font-bold uppercase tracking-widest"
                          >
                            Save Failed
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <AnimatePresence>
                      {showPublishConfirm && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full right-0 mb-3 w-64 bg-white border border-stone-200 rounded-2xl shadow-xl p-4 z-50"
                        >
                          <div className="text-center">
                            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                               <Globe size={20} className="text-emerald-600" />
                            </div>
                            <h4 className="text-sm font-bold text-stone-900 mb-1">Ready to Publish?</h4>
                            <p className="text-[11px] text-stone-500 mb-4">This will make your article visible to the public immediately.</p>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleSave(true)}
                                className="flex-1 py-2 bg-emerald-600 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                              >
                                CONFIRM & PUBLISH
                              </button>
                              <button 
                                onClick={() => setShowPublishConfirm(false)}
                                className="px-3 py-2 bg-stone-100 text-stone-500 text-[11px] font-bold rounded-lg hover:bg-stone-200 transition-colors"
                              >
                                CANCEL
                              </button>
                            </div>
                          </div>
                          <div className="absolute top-full right-8 -mt-px w-3 h-3 bg-white border-r border-b border-stone-200 rotate-45" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0 pb-12">
                <div className="flex-1 flex flex-col gap-6">
                  <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col relative h-[600px] lg:flex-1 min-h-0 overflow-hidden">
                  <div className="p-2 border-b border-stone-100 flex items-center gap-1 text-stone-400 overflow-x-auto no-scrollbar bg-stone-50/30">
                    <div className="flex items-center gap-1.5 px-3 shrink-0">
                      <button 
                        onClick={() => insertFormatting('bold')} 
                        className={`p-2 rounded-lg transition-all flex items-center justify-center shrink-0 ${activeFormats.bold ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm text-stone-400 dark:text-stone-500'}`} 
                        title="Bold"
                      >
                        <Bold size={16} />
                      </button>
                      <button 
                        onClick={() => insertFormatting('italic')} 
                        className={`p-2 rounded-lg transition-all flex items-center justify-center shrink-0 ${activeFormats.italic ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm text-stone-400 dark:text-stone-500'}`} 
                        title="Italic"
                      >
                        <Italic size={16} />
                      </button>
                      <button 
                        onClick={() => insertFormatting('underline')} 
                        className={`p-2 rounded-lg transition-all flex items-center justify-center shrink-0 ${activeFormats.underline ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm text-stone-400 dark:text-stone-500'}`} 
                        title="Underline"
                      >
                        <Underline size={16} />
                      </button>
                      <button 
                        onClick={() => insertFormatting('strike')} 
                        className={`p-2 rounded-lg transition-all flex items-center justify-center shrink-0 ${activeFormats.strike ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm text-stone-400 dark:text-stone-500'}`} 
                        title="Strikethrough"
                      >
                        <Strikethrough size={16} />
                      </button>
                    </div>
                    
                    <div className="w-px h-6 bg-stone-200/60 mx-1 shrink-0"></div>
                    
                    <div className="flex items-center gap-1.5 px-3 shrink-0">
                      <button 
                        onClick={() => insertFormatting('undo')} 
                        className="p-2 hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm rounded-lg transition-all flex items-center justify-center shrink-0 text-stone-400 dark:text-stone-500" 
                        title="Undo"
                      >
                        <Undo size={16} />
                      </button>
                      <button 
                        onClick={() => insertFormatting('redo')} 
                        className="p-2 hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm rounded-lg transition-all flex items-center justify-center shrink-0 text-stone-400 dark:text-stone-500" 
                        title="Redo"
                      >
                        <Redo size={16} />
                      </button>
                    </div>

                    <div className="w-px h-6 bg-stone-200/60 mx-1 shrink-0"></div>
                    
                    <div className="flex items-center gap-1.5 px-3 shrink-0">
                      <button 
                        onClick={() => insertFormatting('header-1')} 
                        className={`p-2 rounded-lg transition-all flex items-center justify-center shrink-0 ${activeFormats.header === 1 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm text-stone-400 dark:text-stone-500'}`} 
                        title="Heading 1"
                      >
                        <Heading1 size={16} />
                      </button>
                      <button 
                        onClick={() => insertFormatting('header-2')} 
                        className={`p-2 rounded-lg transition-all flex items-center justify-center shrink-0 ${activeFormats.header === 2 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm text-stone-400 dark:text-stone-500'}`} 
                        title="Heading 2"
                      >
                        <Heading2 size={16} />
                      </button>
                      <button 
                        onClick={() => insertFormatting('header-3')} 
                        className={`p-2 rounded-lg transition-all flex items-center justify-center shrink-0 ${activeFormats.header === 3 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm text-stone-400 dark:text-stone-500'}`} 
                        title="Heading 3"
                      >
                        <Heading3 size={16} />
                      </button>
                    </div>
                    
                    <div className="w-px h-6 bg-stone-200/60 mx-1 shrink-0"></div>
                    
                    <div className="flex items-center gap-1.5 px-3 shrink-0">
                      <button 
                        onClick={() => insertFormatting('list', 'bullet')} 
                        className={`p-2 rounded-lg transition-all flex items-center justify-center shrink-0 ${activeFormats.list === 'bullet' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm text-stone-400 dark:text-stone-500'}`} 
                        title="Unordered List"
                      >
                        <List size={16} />
                      </button>
                      <button 
                        onClick={() => insertFormatting('list', 'ordered')} 
                        className={`p-2 rounded-lg transition-all flex items-center justify-center shrink-0 ${activeFormats.list === 'ordered' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm text-stone-400 dark:text-stone-500'}`} 
                        title="Ordered List"
                      >
                        <ListOrdered size={16} />
                      </button>
                      <button 
                        onClick={() => insertFormatting('blockquote')} 
                        className={`p-2 rounded-lg transition-all flex items-center justify-center shrink-0 ${activeFormats.blockquote ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm text-stone-400 dark:text-stone-500'}`} 
                        title="Quote"
                      >
                        <Quote size={16} />
                      </button>
                    </div>
                    
                    <div className="w-px h-6 bg-stone-200/60 mx-1 shrink-0"></div>
                    
                    <div className="flex items-center gap-1.5 px-3 shrink-0">
                      <button 
                        onClick={() => insertFormatting('code')} 
                        className={`p-2 rounded-lg transition-all flex items-center justify-center shrink-0 ${activeFormats.code ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm text-stone-400 dark:text-stone-500'}`} 
                        title="Inline Code"
                      >
                        <Code size={16} />
                      </button>
                      <button 
                        onClick={() => insertFormatting('code-block')} 
                        className={`p-2 rounded-lg transition-all flex items-center justify-center shrink-0 ${activeFormats['code-block'] ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm text-stone-400 dark:text-stone-500'}`} 
                        title="Code Block"
                      >
                        <Type size={16} />
                      </button>
                      <button onClick={() => {
                        if (quillRef.current) {
                          const quill = quillRef.current.getEditor();
                          const range = quill.getSelection();
                          if (range) {
                            quill.insertText(range.index, '\n---\n');
                          }
                        }
                      }} className="p-2 hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm rounded-lg transition-all flex items-center justify-center shrink-0 text-stone-400 dark:text-stone-500" title="Horizontal Rule"><Minus size={16} /></button>
                    </div>

                    <div className="w-px h-6 bg-stone-200/60 mx-1 shrink-0"></div>

                    {/* Alignment tools */}
                    <div className="flex items-center gap-1.5 px-3 shrink-0">
                      <button onClick={() => {
                        if (quillRef.current) {
                          const quill = quillRef.current.getEditor();
                          const range = quill.getSelection(true);
                          quill.format('align', false);
                          quill.setSelection(range.index, 0);
                        }
                      }} className="p-2 hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm rounded-lg transition-all flex items-center justify-center shrink-0 text-stone-400 dark:text-stone-500" title="Align Left"><AlignLeft size={16} /></button>
                      <button onClick={() => {
                        if (quillRef.current) quillRef.current.getEditor().format('align', 'center');
                      }} className="p-2 hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm rounded-lg transition-all flex items-center justify-center shrink-0 text-stone-400 dark:text-stone-500" title="Align Center"><AlignCenter size={16} /></button>
                      <button onClick={() => {
                        if (quillRef.current) quillRef.current.getEditor().format('align', 'right');
                      }} className="p-2 hover:bg-white dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white hover:shadow-sm rounded-lg transition-all flex items-center justify-center shrink-0 text-stone-400 dark:text-stone-500" title="Align Right"><AlignRight size={16} /></button>
                    </div>
                    
                    <div className="w-px h-6 bg-stone-200/60 mx-1 shrink-0"></div>

                     <div className="relative">
                      <button 
                        onClick={() => setShowToneDropdown(!showToneDropdown)}
                        disabled={aiLoading || !content}
                        className={`p-2 rounded-lg flex items-center justify-center transition-all group shrink-0 ${showToneDropdown ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'}`}
                        title="Rewrite Selected Section with AI (Choose Tone)"
                      >
                        {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="group-hover:scale-110 transition-transform" />}
                      </button>
                      
                      <AnimatePresence>
                        {showToneDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowToneDropdown(false)} />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className="absolute left-0 top-full mt-2 w-52 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] py-2.5 z-50 overflow-hidden"
                            >
                              <div className="px-4 py-1.5 border-b border-stone-100 dark:border-stone-800 mb-1.5 flex items-center justify-between">
                                <span className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest block">Choose AI Tone</span>
                                <Sparkles size={10} className="text-emerald-500" />
                              </div>
                              {AI_TONES.map(tone => (
                                <button
                                  key={tone.id}
                                  onClick={() => {
                                    setAiTone(tone.id);
                                    setShowToneDropdown(false);
                                    handleRewriteSection(tone.id);
                                  }}
                                  className={`w-full px-4 py-2 text-left text-[11px] font-bold flex items-center justify-between uppercase tracking-wider transition-colors ${aiTone === tone.id ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white'}`}
                                >
                                  {tone.label}
                                  {aiTone === tone.id && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                                </button>
                              ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    <div className="w-px h-6 bg-stone-200/60 dark:bg-stone-800 mx-1 shrink-0"></div>
                    
                    <button 
                      onClick={() => {
                        setMediaTarget('content');
                        setShowMediaInsertModal(true);
                      }} 
                      className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center transition-all shrink-0" 
                      title="Insert Image / Media Library"
                    >
                      <ImageIcon size={16} />
                    </button>
                  </div>
                  
                  <div className="flex-1 flex flex-col quill-container">
                    <ReactQuill 
                      ref={quillRef}
                      value={content}
                      onChange={(newContent) => {
                        setContent(newContent);
                        if (quillRef.current) {
                          setActiveFormats(quillRef.current.getEditor().getFormat());
                        }
                      }}
                      onChangeSelection={(range) => {
                        if (quillRef.current) {
                          setActiveFormats(quillRef.current.getEditor().getFormat(range || undefined));
                        }
                      }}
                      placeholder="Start sculpting your masterpiece here..."
                      theme="snow"
                      modules={{
                        toolbar: false // Using our custom toolbar
                      }}
                      className="flex-1 flex flex-col"
                    />
                    <style>{`
                      .quill-container .ql-container {
                        border: none !important;
                        font-family: inherit;
                        font-size: 1rem;
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                      }
                      .quill-container .ql-editor {
                        padding: 2rem 2.5rem;
                        flex: 1;
                        min-height: 400px;
                        color: #1c1917;
                        line-height: 1.8;
                        font-size: 1.125rem;
                        overflow-y: auto;
                      }
                      .quill-container .ql-editor.ql-blank::before {
                        left: 2rem;
                        color: #d6d3d1;
                        font-style: italic;
                      }
                      .dark .quill-container .ql-editor {
                        color: #e7e5e4;
                      }
                      .quill-container .ql-editor h1 { font-family: serif; font-size: 2.5rem; font-weight: bold; margin-bottom: 1.5rem; }
                      .quill-container .ql-editor h2 { font-family: serif; font-size: 2rem; font-weight: bold; margin-top: 2rem; margin-bottom: 1rem; }
                      .quill-container .ql-editor h3 { font-family: serif; font-size: 1.5rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.75rem; }
                      .quill-container .ql-editor p { margin-bottom: 1.25rem; }
                      .quill-container .ql-editor blockquote { border-left: 4px solid #10b981; padding-left: 1.5rem; font-style: italic; color: #57534e; margin: 2rem 0; }
                      .dark .quill-container .ql-editor blockquote { color: #a8a29e; }
                    `}</style>
                  </div>
                </div>
              </div>

              <div className="w-full xl:w-72 flex flex-col gap-6">
                {/* Meta details */}
                 <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                       <h4 className="text-xs font-black text-stone-900 uppercase tracking-[0.2em]">Artisan Workshop</h4>
                       <Sparkles size={14} className="text-emerald-500" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setShowAiGeneratorModal(true)}
                        disabled={aiLoading}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-stone-50 border border-stone-100 rounded-2xl hover:border-emerald-500 hover:bg-white transition-all group disabled:opacity-50"
                      >
                        <Wand2 size={18} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-stone-500">Sculpt</span>
                      </button>
                      <button 
                        onClick={handleSEO}
                        disabled={aiLoading}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-stone-50 border border-stone-100 rounded-2xl hover:border-blue-500 hover:bg-white transition-all group disabled:opacity-50"
                      >
                        <Globe size={18} className="text-blue-600 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-stone-500">SEO</span>
                      </button>
                      <button 
                        onClick={handleSummarize}
                        disabled={aiLoading}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-stone-50 border border-stone-100 rounded-2xl hover:border-amber-500 hover:bg-white transition-all group disabled:opacity-50"
                      >
                        <PanelRight size={18} className="text-amber-600 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-stone-500">Excerpt</span>
                      </button>
                      <button 
                        onClick={() => {
                          setMediaTarget('content');
                          setShowMediaInsertModal(true);
                        }}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-stone-50 border border-stone-100 rounded-2xl hover:border-indigo-500 hover:bg-white transition-all group"
                      >
                        <ImageIcon size={18} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-stone-500">Art</span>
                      </button>
                    </div>

                    <div className="pt-4 border-t border-stone-100 space-y-4">
                       <div>
                         <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 block">Permalink Slug</label>
                        <input 
                          value={slug}
                          onChange={(e) => setSlug(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-xs text-stone-600 focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">Featured Image</label>
                        <div className="space-y-3">
                          {featuredImage ? (
                            <div className="relative group rounded-xl overflow-hidden border border-stone-100">
                              <img src={featuredImage} referrerPolicy="no-referrer" className="w-full aspect-video object-cover" />
                              <button 
                                onClick={() => setFeaturedImage('')}
                                className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur shadow-sm rounded-lg text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                setMediaTarget('featured');
                                setShowMediaInsertModal(true);
                              }}
                              className="w-full aspect-video border-2 border-dashed border-stone-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-stone-300 hover:text-emerald-500 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group"
                            >
                              <div className="p-3 bg-stone-50 rounded-2xl group-hover:bg-emerald-50 transition-colors">
                                <ImageIcon size={20} />
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest">Set Featured</span>
                            </button>
                          )}
                          
                          <button 
                            onClick={() => setShowImagePrompt(!showImagePrompt)}
                            className="w-full text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center justify-center gap-2 py-2 border border-emerald-100 rounded-xl hover:bg-emerald-50 transition-colors"
                          >
                            <Sparkles size={12} /> AI Magic Image
                          </button>
                          
                          <AnimatePresence>
                            {showImagePrompt && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3 pt-2"
                              >
                                <textarea 
                                  value={imagePrompt}
                                  onChange={(e) => setImagePrompt(e.target.value)}
                                  placeholder="Describe the image you want AI to generate..."
                                  className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3 text-xs text-stone-600 focus:outline-none min-h-[80px]"
                                />
                                <div className="flex flex-wrap gap-1.5">
                                  {stylePresets.map(s => (
                                    <button 
                                      key={s.id}
                                      onClick={() => setImageStyle(s.id)}
                                      className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${imageStyle === s.id ? 'bg-emerald-600 text-white ring-2 ring-emerald-100' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'}`}
                                    >
                                      {s.label}
                                    </button>
                                  ))}
                                </div>
                                <button 
                                  onClick={handleAiImageGen}
                                  disabled={aiLoading || !imagePrompt}
                                  className="w-full bg-stone-900 text-white rounded-xl py-2 text-xs font-bold hover:bg-stone-800 disabled:bg-stone-200 transition-all flex items-center justify-center gap-2"
                                >
                                  {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} 
                                  GENERATE WITH GEMINI
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                           <label className="text-[10px] font-bold text-stone-400 uppercase">Excerpt</label>
                           <button onClick={handleSummarize} className="text-[10px] text-emerald-600 font-bold hover:underline">Use AI Summary</button>
                        </div>
                        <textarea 
                          value={excerpt}
                          onChange={(e) => setExcerpt(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-xs text-stone-600 focus:outline-none min-h-[100px]"
                        />
                      </div>
                   </div>
                </div>

                <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
                   <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest">SEO Settings</h4>
                      <button onClick={handleSEO} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
                        <Wand2 size={14} />
                      </button>
                   </div>
                   <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">Meta Title</label>
                        <input 
                          value={seoTitle}
                          onChange={(e) => setSeoTitle(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-xs text-stone-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">Meta Description</label>
                        <textarea 
                          value={seoDescription}
                          onChange={(e) => setSeoDescription(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-xs text-stone-600 focus:outline-none min-h-[80px]"
                        />
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-12 text-center"
            >
               <div className="w-24 h-24 bg-stone-100 rounded-3xl flex items-center justify-center text-stone-300 mb-8">
                  <FileText size={48} />
               </div>
               <h1 className="text-3xl font-serif font-bold text-stone-900 mb-4">Start Your Masterpiece</h1>
               <p className="text-stone-500 max-w-sm mb-10 leading-relaxed italic">Page Pilot is ready for your stories. Select an article to begin editing or create something new.</p>
               <button 
                onClick={handleCreatePost}
                className="bg-stone-900 text-white px-8 py-3 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-stone-800 transition-all flex items-center gap-3 active:scale-95 shadow-xl shadow-stone-900/10"
               >
                 <Plus size={20} /> Create New Story
               </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Media Manager Modal */}
      <AnimatePresence>
        {showMediaInsertModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-stone-900/40 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-stone-900 w-full max-w-3xl h-[80vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-stone-100 dark:border-stone-800 transition-colors"
            >
               <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                      <ImageIcon size={18} />
                    </div>
                    <h3 className="font-serif font-bold text-stone-900 dark:text-white">Media Library</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="bg-stone-900 dark:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-stone-800 dark:hover:bg-emerald-500 transition-colors">
                      Upload New
                      <input type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*" />
                    </label>
                    <button onClick={() => setShowMediaInsertModal(false)} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-400 dark:text-stone-600">
                      <X size={20} />
                    </button>
                  </div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6">
                  {/* External URL Input */}
                  <div className="mb-6 bg-stone-50 dark:bg-stone-950 p-4 rounded-2xl border border-stone-100 dark:border-stone-800 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase">External Image URL</label>
                      <Globe size={10} className="text-stone-300 dark:text-stone-700" />
                    </div>
                    <div className="flex gap-2">
                       <input 
                        type="url"
                        value={externalImageUrl}
                        onChange={(e) => setExternalImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="flex-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-stone-300 dark:placeholder:text-stone-700 transition-colors"
                       />
                       <button 
                        onClick={() => {
                          if (!externalImageUrl) return;
                          if (mediaTarget === 'content' && quillRef.current) {
                            const quill = quillRef.current.getEditor();
                            const range = quill.getSelection(true);
                            if (externalImageUrl.match(/\.(mp4|webm|ogg)$/i) || externalImageUrl.match(/\.(mp3|wav)$/i)) {
                               quill.insertEmbed(range.index, 'video', externalImageUrl);
                            } else {
                               quill.insertEmbed(range.index, 'image', externalImageUrl);
                            }
                          } else {
                            setFeaturedImage(externalImageUrl);
                          }
                          setExternalImageUrl('');
                          setShowMediaInsertModal(false);
                        }}
                        className="bg-stone-900 dark:bg-stone-850 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors shrink-0"
                       >
                         USE URL
                       </button>
                    </div>
                  </div>

                  {uploadProgress !== null && (
                    <div className="mb-8 bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 animate-pulse transition-colors">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">Uploading files ({Math.round(uploadProgress)}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-emerald-200/50 dark:bg-emerald-900/30 rounded-full overflow-hidden">
                           <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            className="h-full bg-emerald-500"
                           />
                        </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                     {gallery.map(img => (
                       <motion.div 
                        key={img._id || img.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{ scale: 1.02 }}
                        className="group relative aspect-square rounded-2xl overflow-hidden bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 cursor-pointer transition-colors"
                        onClick={() => {
                          if (mediaTarget === 'content' && quillRef.current) {
                            const quill = quillRef.current.getEditor();
                            const range = quill.getSelection(true);
                            if (img.type === 'video' || img.type === 'audio') {
                              quill.insertEmbed(range.index, 'video', img.url);
                            } else if (img.type === 'ebook') {
                              quill.insertText(range.index, img.name || 'Document', 'link', img.url);
                            } else {
                              quill.insertEmbed(range.index, 'image', img.url);
                            }
                          } else {
                            setFeaturedImage(img.url);
                          }
                          setShowMediaInsertModal(false);
                        }}
                       >
                          {img.type === 'image' || !img.type ? (
                            <img src={img.url} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : img.type === 'video' ? (
                            <div className="w-full h-full bg-stone-900 flex items-center justify-center text-white">
                               <Video size={32} className="opacity-50" />
                            </div>
                          ) : img.type === 'audio' ? (
                            <div className="w-full h-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
                               <Music size={32} />
                            </div>
                          ) : (
                            <div className="w-full h-full bg-stone-50 dark:bg-stone-900 flex flex-col items-center justify-center text-stone-400">
                               <FileText size={32} />
                               <span className="text-[9px] font-bold mt-2 truncate w-full px-2 text-center uppercase tracking-widest">{img.name}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/40 transition-colors flex items-center justify-center">
                             <Plus size={24} className="text-white opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all" />
                          </div>
                       </motion.div>
                     ))}
                  </div>
                  {gallery.length === 0 && (
                    <div className="text-center py-20 opacity-30 dark:opacity-20 italic font-serif">
                       <ImageIcon size={48} className="mx-auto mb-4 opacity-10" />
                       <p className="text-stone-900 dark:text-stone-100">Your gallery is empty. Start by uploading some art.</p>
                    </div>
                  )}
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
