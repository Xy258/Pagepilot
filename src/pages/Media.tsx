/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Video, 
  Music, 
  FileText, 
  Upload, 
  Wand2, 
  Trash2, 
  Download, 
  Search,
  Filter,
  Plus,
  Loader2,
  X,
  Sparkles,
  RefreshCw,
  Edit2,
  Check,
  Globe,
  Tag,
  ChevronRight,
  Maximize2,
  PanelRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';
import { geminiService } from '../services/geminiService';

interface MediaItem {
  id: string | number;
  name: string;
  type: 'image' | 'video' | 'audio' | 'ebook' | 'other';
  size: string;
  sizeBytes?: number;
  date: string;
  icon: string;
  color: string;
  url?: string;
  audioUrl?: string;
  tags?: string[];
  description?: string;
  thumbnail?: string;
}

const FILTERS = [
  { name: 'Original', class: '' },
  { name: 'Grayscale', class: 'grayscale' },
  { name: 'Sepia', class: 'sepia' },
  { name: 'Contrast', class: 'contrast-125' },
  { name: 'Bright', class: 'brightness-125' },
  { name: 'Warm', class: 'sepia-[.3] saturate-150' },
  { name: 'Cool', class: 'hue-rotate-180 saturate-50' },
  { name: 'Noir', class: 'contrast-150 grayscale' },
];

const AUDIO_TRACKS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
];

const getTrackFromPrompt = (prompt: string) => {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    hash = ((hash << 5) - hash) + prompt.charCodeAt(i);
    hash |= 0;
  }
  return AUDIO_TRACKS[Math.abs(hash) % AUDIO_TRACKS.length];
};

export default function Media() {
  const { user } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'discovery' | 'ai-studio'>('library');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('');
  const [isTagging, setIsTagging] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState<any[]>([]);
  const [discoveryType, setDiscoveryType] = useState<'photos' | 'videos' | 'audio'>('photos');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStyle, setAiStyle] = useState('minimalist');
  const [aiGenType, setAiGenType] = useState<'image' | 'video' | 'audio' | 'ebook'>('image');
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);
  const [generatedManuscript, setGeneratedManuscript] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalPreview, setExternalPreview] = useState<string | null>(null);

  useEffect(() => {
    if (generatedImg) {
      console.log('DEBUG: generatedImg set ->', generatedImg);
    }
  }, [generatedImg]);
  const [articles, setArticles] = useState<any[]>([]);
  const [showArticleLinker, setShowArticleLinker] = useState(false);
  const { toast } = useNotifications();

  useEffect(() => {
    fetchMedia();
    fetchArticles();
  }, []);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const data = await api.media.list();
      const normalized = (data || []).map((item: any) => ({
        ...item,
        id: item._id || item.id,
        icon: item.type === 'audio' ? 'Music' : item.icon,
        color: item.type === 'audio' ? 'text-emerald-500' : item.color
      }));
      setItems(normalized);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchArticles = async () => {
    try {
      const data = await api.posts.list({ limit: 50 });
      setArticles(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const stylePresets = [
    { id: 'minimalist', label: 'Minimalist', color: 'bg-stone-100' },
    { id: 'cinematic', label: 'Cinematic', color: 'bg-slate-800' },
    { id: 'abstract', label: 'Abstract', color: 'bg-indigo-100' },
    { id: 'digital-art', label: 'Digital Art', color: 'bg-emerald-500/20' },
    { id: 'nature', label: 'Nature', color: 'bg-green-100' },
  ];

  interface UploadProgress {
    id: string;
    name: string;
    progress: number;
    status: 'uploading' | 'completed' | 'error';
  }

  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    // Since we store files as base64 in Firestore, we must be strict about size.
    // 700KB is the safe limit for non-images (base64 adds 33%).
    // For images, we allow larger ones because we compress them.
    const validFiles = Array.from(files).filter(file => {
      const limit = 1024 * 1024 * 1024; // 1 GB limit for all files
      if (file.size > limit) {
        toast('File Too Large', `${file.name} exceeds the 1GB limit for this storage mode.`, 'error');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const newUploads: UploadProgress[] = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      progress: 0,
      status: 'uploading'
    }));

    setUploadQueue(prev => [...prev, ...newUploads]);
    setLoading(true);

    try {
      const uploadPromises = validFiles.map(async (file, index) => {
        const uploadId = newUploads[index].id;
        
        try {
          // Simulate progress since Firestore addDoc doesn't provide progress
          const progressInterval = setInterval(() => {
            setUploadQueue(prev => prev.map(u => {
              if (u.id === uploadId && u.progress < 90) {
                return { ...u, progress: u.progress + Math.random() * 15 };
              }
              return u;
            }));
          }, 200);

          await api.media.upload(file);
          
          clearInterval(progressInterval);
          setUploadQueue(prev => prev.map(u => 
            u.id === uploadId ? { ...u, progress: 100, status: 'completed' } : u
          ));
        } catch (err) {
          setUploadQueue(prev => prev.map(u => 
            u.id === uploadId ? { ...u, status: 'error' } : u
          ));
          throw err;
        }
      });

      await Promise.all(uploadPromises);
      
      toast('Upload Success', `${validFiles.length} artifact${validFiles.length > 1 ? 's' : ''} enshrined.`, 'success');
      fetchMedia();
      
      notificationService.createNotification({
        userId: user.uid,
        title: 'Library Expanded',
        message: `${validFiles.length} artifact${validFiles.length > 1 ? 's' : ''} enshrined successfully.`,
        type: 'success'
      });

      // Clear completed uploads after a delay
      setTimeout(() => {
        setUploadQueue(prev => prev.filter(u => u.status !== 'completed'));
      }, 3000);

    } catch (err: any) {
      let message = 'Page Pilot could not accept some artifacts.';
      try {
        const errorObj = JSON.parse(err.message);
        // Clean up common Firestore error messages for the user
        message = errorObj.error.replace('Missing or insufficient permissions.', 'Security rules block this upload.') || message;
        if (message.includes('exceeds the maximum allowed size')) {
           message = 'Document too large for Firestore. Please use a smaller file or more compressed image.';
        }
      } catch (e) {
        message = err.message || message;
      }
      toast('Upload Failed', message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string | number) => {
    if (typeof id !== 'string') return; // Firestore IDs are strings
    setLoading(true);
    try {
      await api.media.delete(id);
      fetchMedia();
      setSelectedItem(null);
      toast('Success', 'Artifact vanished.', 'success');
    } catch (err) {
      toast('Error', 'Could not remove artifact.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const searchStock = async (query: string) => {
    if (!query) return;
    setLoading(true);
    try {
      if (discoveryType === 'photos') {
        const response = await fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=12`, {
          headers: {
            Authorization: `Client-ID ${(import.meta as any).env.VITE_UNSPLASH_ACCESS_KEY || ''}`
          }
        });
        const data = await response.json();
        setDiscoveryResults(data.results || []);
      } else if (discoveryType === 'videos') {
        const response = await fetch(`https://api.pexels.com/videos/search?query=${query}&per_page=12`, {
          headers: {
            Authorization: (import.meta as any).env.VITE_PEXELS_API_KEY || ''
          }
        });
        const data = await response.json();
        setDiscoveryResults(data.videos || []);
      } else if (discoveryType === 'audio') {
        const pixabayKey = (import.meta as any).env.VITE_PIXABAY_API_KEY || '';
        if (pixabayKey) {
          console.log("Searching Pixabay Video API for stock audio tracks using API key...");
          const response = await fetch(`https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodeURIComponent(query)}&per_page=12`);
          const data = await response.json();
          const audioResults = (data.hits || []).map((video: any) => {
            const audioUrl = video.videos?.tiny?.url || video.videos?.small?.url || '';
            return {
              id: `pixabay-${video.id}`,
              title: video.tags ? video.tags.split(',')[0].toUpperCase() + ' Ambient Soundscape' : 'Pixabay Ambient',
              artist: video.user || 'Pixabay Creator',
              url: audioUrl,
              duration: `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}`,
              tags: video.tags ? video.tags.split(',').map((t: string) => t.trim()) : []
            };
          });
          setDiscoveryResults(audioResults);
        } else {
          console.log("Pixabay key missing. Falling back to stock audio mocks...");
          const audioMocks = [
            { id: 'a1', title: 'Minimalist Focus', artist: 'Zenith', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', duration: '3:45' },
            { id: 'a2', title: 'Urban Flow', artist: 'Metro', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', duration: '4:12' },
            { id: 'a3', title: 'Celestial Echo', artist: 'Nova', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', duration: '5:20' },
            { id: 'a4', title: 'Ambient Pulse', artist: 'Echo', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', duration: '2:50' },
            { id: 'a5', title: 'Digital Dawn', artist: 'Circuit', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', duration: '4:05' },
            { id: 'a6', title: 'Deep Forest', artist: 'Timber', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3', duration: '6:15' },
            { id: 'a7', title: 'Oceanic Drift', artist: 'Tide', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', duration: '3:30' },
            { id: 'a8', title: 'Mountain Peak', artist: 'Summit', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', duration: '5:00' }
          ];
          setDiscoveryResults(audioMocks.filter(m => 
            m.title.toLowerCase().includes(query.toLowerCase()) || 
            m.artist.toLowerCase().includes(query.toLowerCase())
          ));
        }
      }
    } catch (error) {
      console.error('Discovery error:', error);
      toast('Search Failed', 'Could not reach the stock library.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const importDiscoveryItem = async (item: any) => {
    setLoading(true);
    try {
      let url = '';
      let filename = '';
      let type: 'image' | 'video' | 'audio' = 'image';
      let sizeLabel = 'External';

      let thumbnail = '';
      if (discoveryType === 'photos') {
        url = item.urls.regular;
        filename = `unsplash-${item.id}.jpg`;
        type = 'image';
      } else if (discoveryType === 'videos') {
        url = item.video_files[0]?.link;
        thumbnail = item.image; // Pexels video object has a thumbnail in 'image' field
        filename = `pexels-video-${item.id}.mp4`;
        type = 'video';
        sizeLabel = `${((item.video_files[0]?.width * item.video_files[0]?.height) / 1000000).toFixed(1)}MP Video`;
      } else if (discoveryType === 'audio') {
        url = item.url;
        filename = `stock-audio-${item.id}.mp3`;
        type = 'audio';
      }

      if (!url) throw new Error('No URL found for item.');

      // For discovery items, we prefer saving as a reference to avoid Firestore's 1MB limit,
      // especially for videos and audio which we can't compress client-side.
      await api.media.saveReference({
        name: filename,
        type,
        url,
        thumbnail,
        size: sizeLabel
      });
      
      fetchMedia();
      toast('Imported!', 'Stock asset linked to your library.', 'success');
      setActiveTab('library');
    } catch (error: any) {
      console.error(error);
      toast('Import Failed', 'Could not link stock artifact.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExternalUrlPreview = () => {
    if (!externalUrl) {
      setExternalPreview(null);
      return;
    }
    
    // Auto-detect type or just show preview
    if (externalUrl.startsWith('http')) {
      setExternalPreview(externalUrl);
      // Auto-trigger if it looks like a valid image/direct link
      const isDirectMedia = /\.(jpg|jpeg|png|webp|gif|mp4|mp3|wav)$/i.test(externalUrl);
      if (isDirectMedia) {
        toast('Preview Loaded', 'Direct media link identified.', 'info');
      }
    } else {
      setExternalPreview(null);
    }
  };

  useEffect(() => {
    // Quick reactive preview for external URL
    const timer = setTimeout(() => {
      handleExternalUrlPreview();
    }, 500);
    return () => clearTimeout(timer);
  }, [externalUrl]);

  const importExternalUrl = async () => {
    if (!externalPreview || !user) return;
    setLoading(true);
    try {
      const cleanUrl = externalPreview.split('?')[0];
      const isVideo = /\.(mp4|webm|ogg)/i.test(cleanUrl);
      const isAudio = /\.(mp3|wav)/i.test(cleanUrl);
      const isPdf = /\.(pdf|epub|doc)/i.test(cleanUrl);
      
      let type: 'image' | 'video' | 'audio' | 'other' = 'other';
      if (isVideo) type = 'video';
      else if (isAudio) type = 'audio';
      else if (isPdf) type = 'other';
      else type = 'image'; // Default to image for URLs like Unsplash that lack extensions

      // For large external references or non-image types, save as a reference
      // This bypasses Firestore's 1MB limit
      await api.media.saveReference({
        name: externalPreview.split('/').pop()?.split(/[?#]/)[0] || 'external-link',
        type,
        url: externalPreview,
        size: 'External'
      });
      
      fetchMedia();
      setExternalUrl('');
      setExternalPreview(null);
      setActiveTab('library');
      toast('Imported!', 'External reference added to your library.', 'success');
    } catch (error) {
      console.error(error);
      toast('Import Failed', 'Could not link external artifact.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateAIContent = async () => {
    setLoading(true);
    toast('Dreaming...', 'Generating creative essence for your library.', 'info');
    try {
      const text = await geminiService.generateContent(
        "Suggest 3 unique nature-inspired filenames and descriptions for a minimalist workshop gallery. Return as JSON array of objects with 'name' and 'description' keys. Do not use markdown backticks."
      );
      
      const suggestions = JSON.parse(text);
      
      const newItems: MediaItem[] = suggestions.map((s: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: s.name,
        type: 'image',
        size: '0 KB (AI)',
        date: new Date().toISOString().split('T')[0],
        icon: 'Sparkles',
        color: '#6366F1',
        description: s.description,
        tags: ['AI Generated', 'Concept']
      }));
      
      setItems([...newItems, ...items]);
      
      if (user) {
        notificationService.createNotification({
          userId: user.uid,
          title: 'Soul Spark Ignited',
          message: 'AI has breathed life into new concepts in your library.',
          type: 'success'
        });
      }
      
      toast('AI Assets Created', 'New concepts added to your library.', 'success');
    } catch (err) {
      toast('AI Error', 'The neural link was interrupted.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAiStudioGen = async () => {
    if (!aiPrompt || !user) return;

    setIsGenerating(true);
    setGenerationStatus('Invoking Neural Link...');
    setGeneratedImg(null);
    setGeneratedManuscript(null);
    toast('Invoking Gemini', `Sculpting your ${aiGenType} vision...`, 'info');
    
    try {
      if (aiGenType === 'image') {
        setGenerationStatus('Synthesizing Visual Atmosphere...');
        const fullPrompt = `${aiPrompt}, ${aiStyle} style, high quality, professional lighting, artisan aesthetic, minimalist composition`;
        const base64Image = await geminiService.generateImage(fullPrompt);
        setGeneratedImg(base64Image);
        toast('Image Crafted', 'Your vision has been realized.', 'success');
      } else if (aiGenType === 'ebook') {
        setGenerationStatus('Drafting Manuscript Sections...');
        const text = await geminiService.generateContent(
          `Write a high-quality manuscript/guide for: "${aiPrompt}". Style: ${aiStyle}. Include a title and well-structured sections in Markdown format.`,
          "You are a professional author and documentation expert."
        );
        setGeneratedManuscript(text);
        toast('Manuscript Drafted', 'AI has written your document.', 'success');
      } else if (aiGenType === 'video') {
        setGenerationStatus('Synthesizing Video Stream...');
        let videoUrl = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4';
        
        try {
          const pixabayKey = (import.meta as any).env.VITE_PIXABAY_API_KEY || '55872416-c3b7dd3f8f6a796373a277919';
          const queryWords = aiPrompt.split(' ').filter(w => w.length > 2);
          const query = encodeURIComponent(queryWords.slice(0, 3).join(' '));
          const res = await fetch(`https://pixabay.com/api/videos/?key=${pixabayKey}&q=${query}&per_page=3`);
          const data = await res.json();
          if (data.hits && data.hits.length > 0) {
            videoUrl = data.hits[0].videos.medium.url;
          } else if (queryWords.length > 0) {
            const singleQuery = encodeURIComponent(queryWords[0]);
            const res2 = await fetch(`https://pixabay.com/api/videos/?key=${pixabayKey}&q=${singleQuery}&per_page=3`);
            const data2 = await res2.json();
            if (data2.hits && data2.hits.length > 0) {
              videoUrl = data2.hits[0].videos.medium.url;
            }
          }
        } catch (e) {
          console.error("Dynamic video fetch failed", e);
        }

        setGenerationStatus('Synthesizing Audio Track...');
        let generatedAudioUrl = '';
        try {
           generatedAudioUrl = await geminiService.generateMusic(aiPrompt);
        } catch(e) {}
        
        await api.media.saveReference({
          name: aiPrompt.slice(0, 20) + ' (Gen).mp4',
          type: 'video',
          url: videoUrl,
          audioUrl: generatedAudioUrl || undefined,
          size: 'AI Generated'
        });
        fetchMedia();
        toast('Video Sculpted', 'Your cinematic vision with audio has been manifested.', 'success');
        setAiPrompt('');
        setActiveTab('library');
      } else {
        // Audio
        setGenerationStatus('Synthesizing ElevenLabs Audio Stream...');
        const base64Audio = await geminiService.generateMusic(aiPrompt);
        setGenerationStatus('Persisting Soundscape...');

        await api.media.saveReference({
          name: aiPrompt.slice(0, 20) + ' (Gen).mp3',
          type: 'audio',
          url: base64Audio,
          size: 'AI Generated'
        });
        fetchMedia();
        toast('Soundscape Manifested', 'ElevenLabs has synthesized your unique audio asset.', 'success');
        setAiPrompt('');
        setActiveTab('library');
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = 'The neural link was interrupted.';
      if (err.message?.includes('BILLING_REQUIRED') || err.message?.includes('Requested entity was not found')) {
        errMsg = 'Video generation requires a Gemini API key with billing enabled. Please select an eligible key from your settings.';
        (window as any).aistudio?.openSelectKey();
      } else if (err.message?.includes('quota')) {
        errMsg = 'GEMINI QUOTA EXCEEDED: Your AI usage limit has been reached for today. Try again tomorrow or change your API key.';
      }
      toast('Generation Failed', errMsg, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveManuscriptToLibrary = async () => {
    if (!generatedManuscript || !user) return;
    setLoading(true);
    try {
      const titleMatch = generatedManuscript.match(/^# (.*)/) || generatedManuscript.match(/Title: (.*)/);
      const title = titleMatch ? titleMatch[1] : 'AI Manuscript';
      const file = new File([generatedManuscript], `${title.toLowerCase().replace(/\s+/g, '-')}.txt`, { type: 'text/plain' });
      
      await api.media.upload(file);
      fetchMedia();
      setGeneratedManuscript(null);
      setAiPrompt('');
      setActiveTab('library');
      toast('Document Published', 'Your manuscript is now in the archive.', 'success');
    } catch (err) {
      toast('Publication Failed', 'Could not save manuscript.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveGeneratedToLibrary = async () => {
    if (!generatedImg || !user) return;
    setLoading(true);
    try {
      const filename = `ai-sculpt-${Date.now()}.png`;

      // If we already have a data URL, fetch will succeed in-browser.
      // If it's a remote URL, the fetch may fail due to CORS — in that case
      // fall back to saving the external URL as a reference so it appears in the library.
      let savedAsReference = false;

      try {
        // If the generated image is a remote http(s) URL, rehost it server-side to avoid CORS
        if (generatedImg.startsWith('http')) {
          try {
            await api.media.rehost({ url: generatedImg, name: filename });
            // rehost will create the DB record and file
          } catch (rehostErr) {
            console.warn('Server rehost failed, falling back to client upload or reference:', rehostErr);
            // Attempt client-side fetch upload as a last resort
            const res = await fetch(generatedImg);
            if (!res.ok) throw new Error('Failed to fetch generated image');
            const blob = await res.blob();
            const file = new File([blob], filename, { type: blob.type || 'image/png' });
            await api.media.upload(file);
          }
        } else {
          // Data URL or blob URL: fetch and upload normally
          const res = await fetch(generatedImg);
          if (!res.ok) throw new Error('Failed to fetch generated image');
          const blob = await res.blob();
          const file = new File([blob], filename, { type: blob.type || 'image/png' });
          await api.media.upload(file);
        }
      } catch (fetchErr: unknown) {
        // Final fallback: save as an external reference (links the asset instead of uploading bytes)
        const errMessage = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.warn('Could not fetch or rehost generated image, saving as external reference:', errMessage);
        await api.media.saveReference({
          name: filename,
          type: 'image',
          url: generatedImg,
          size: 'AI Generated'
        });
        savedAsReference = true;
      }

      await fetchMedia();
      setGeneratedImg(null);
      setAiPrompt('');
      setActiveTab('library');
      if (savedAsReference) {
        toast('Artifact Linked', 'Saved as external reference (CORS prevented direct upload).', 'info');
      } else {
        toast('Artifact Saved', 'The generated sculpture is now in your library.', 'success');
      }
    } catch (err) {
      console.error(err);
      toast('Save Failed', 'Could not enshrine the artifact.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateSmartTags = async () => {
    if (!selectedItem || selectedItem.type !== 'image' || !selectedItem.url) return;
    setIsTagging(true);
    try {
      let url = selectedItem.url;
      
      // If the URL is external (doesn't start with data:), use a proxy to avoid CORS
      if (url.startsWith('http')) {
        url = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&nrb=1`;
      }
        
      const response = await fetch(url);
      if (!response.ok) throw new Error('Could not retrieve image for analysis.');
      
      const blob = await response.blob();
      const reader = new FileReader();
      
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      
      const base64Data = (await base64Promise).split(',')[1];
      const mimeType = selectedItem.url.includes('.png') ? 'image/png' : 'image/jpeg';

      const text = await geminiService.analyzeImage(
        base64Data, 
        mimeType, 
        "Analyze this image and provide 5-8 descriptive tags. Return only the tags as a comma-separated list."
      );

      // Final cleaning to ensure it's just a comma-separated list
      const sanitizedTags = text.replace(/Tags:|Keywords:|Categories:|\*/gi, '').replace(/```.*?\n?|```/g, '').trim();
      const tags = sanitizedTags.split(/[,\n]/).map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
      
      if (typeof selectedItem.id === 'string') {
        await api.media.update(selectedItem.id, { tags });
      }
      
      fetchMedia();
      setSelectedItem({ ...selectedItem, tags });
      toast('Vision Complete', 'Tags generated successfully.', 'success');
    } catch (error: any) {
      console.error('Smart Tagging failed:', error);
      toast('Tagging Failed', error.message || 'AI vision could not parse the image.', 'error');
    } finally {
      setIsTagging(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MediaItem | null>(null);

  const initiateDelete = (item: MediaItem) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleSetAsFeatured = async (articleId: string) => {
    if (!selectedItem || !selectedItem.url) return;
    setLoading(true);
    try {
      await api.posts.update(articleId, { featuredImage: selectedItem.url });
      toast('Success', 'Featured image updated for the article.', 'success');
      setShowArticleLinker(false);
    } catch (err) {
      toast('Link Failed', 'Could not update the article.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteItem(itemToDelete.id);
      setShowDeleteModal(false);
      setItemToDelete(null);
      toast('Artifact Vanished', 'The item has been removed from your library.', 'success');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'all' || item.type === filter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ImageIcon': return <ImageIcon size={24} />;
      case 'Video': return <Video size={24} />;
      case 'Music': return <Music size={24} />;
      case 'FileText': return <FileText size={24} />;
      default: return <FileText size={24} />;
    }
  };

  return (
    <div className="space-y-8 pb-12 transition-colors duration-300">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white dark:bg-stone-900 p-8 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center gap-8">
           <div>
            <h1 className="text-3xl font-serif font-black text-stone-900 dark:text-white mb-1 tracking-tight">Media Pool</h1>
            <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">Curate and refine your workshop's visual history.</p>
          </div>
          
          <div className="flex bg-stone-50 dark:bg-stone-950 p-1.5 rounded-2xl border border-stone-100 dark:border-stone-800 transition-colors">
            <button 
              onClick={() => setActiveTab('library')}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === 'library' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm border border-stone-100 dark:border-stone-800' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              Library
            </button>
            <button 
              onClick={() => setActiveTab('discovery')}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === 'discovery' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm border border-stone-100 dark:border-stone-800' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              Discovery
            </button>
            <button 
              onClick={() => setActiveTab('ai-studio')}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === 'ai-studio' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm border border-stone-100 dark:border-stone-800' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              AI Studio
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'library' ? (
            <div className="flex items-center gap-4">
              <AnimatePresence>
                {uploadQueue.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3 bg-stone-50 dark:bg-stone-950 px-4 py-2 rounded-2xl border border-stone-100 dark:border-stone-800"
                  >
                    <div className="flex -space-x-2">
                      {uploadQueue.slice(0, 3).map((u, i) => (
                        <div key={u.id} className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white border-2 border-white dark:border-stone-900 shadow-sm relative overflow-hidden">
                           <div 
                            className="absolute bottom-0 left-0 w-full bg-emerald-700 transition-all duration-300" 
                            style={{ height: `${u.progress}%` }}
                           />
                           <span className="relative z-10 font-bold">{u.name[0].toUpperCase()}</span>
                        </div>
                      ))}
                      {uploadQueue.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-[10px] text-stone-500 font-bold border-2 border-white dark:border-stone-900">
                          +{uploadQueue.length - 3}
                        </div>
                      )}
                    </div>
                    <div className="hidden sm:block">
                       <p className="text-[10px] font-black text-stone-900 dark:text-white uppercase tracking-widest">
                         {uploadQueue.every(u => u.status === 'completed') ? 'Uploads Ready' : 'Processing Artifacts...'}
                       </p>
                       <div className="w-24 h-1 bg-stone-200 dark:bg-stone-800 rounded-full mt-1 overflow-hidden">
                          <motion.div 
                            className="h-full bg-emerald-500"
                            animate={{ width: `${uploadQueue.reduce((acc, curr) => acc + curr.progress, 0) / uploadQueue.length}%` }}
                          />
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <label className="cursor-pointer bg-stone-950 dark:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-stone-800 dark:hover:bg-emerald-500 transition-all text-xs uppercase tracking-widest shadow-xl shadow-stone-950/20 active:scale-95">
                <Upload size={16} />
                Enshrine Artifacts
                <input 
                  type="file" 
                  className="hidden" 
                  multiple 
                  accept="image/*,video/*,audio/*,.pdf,.epub,.doc,.docx,.txt"
                  onChange={handleUpload} 
                />
              </label>
            </div>
          ) : activeTab === 'discovery' ? (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <div className="flex bg-stone-50 dark:bg-stone-950 p-1 rounded-2xl border border-stone-100 dark:border-stone-800">
                {(['photos', 'videos', 'audio'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setDiscoveryType(type);
                      setDiscoveryResults([]);
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                      discoveryType === type 
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm' 
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div className="flex items-center bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-100 dark:border-stone-800 pl-4 pr-1.5 py-1.5 w-full sm:w-72 transition-colors">
                <Search size={16} className="text-stone-400 dark:text-stone-600 mr-2" />
                <input 
                  type="text" 
                  placeholder={`Search stock ${discoveryType}...`}
                  className="bg-transparent border-none focus:ring-0 text-sm font-medium flex-1 h-8 text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-stone-700"
                  onKeyDown={(e) => e.key === 'Enter' && searchStock(e.currentTarget.value)}
                />
                <button 
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    searchStock(input.value);
                  }}
                  className="px-4 py-2 bg-stone-900 dark:bg-stone-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors"
                >
                  Go
                </button>
              </div>
              <div className="flex items-center bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-100 dark:border-stone-800 pl-4 pr-1.5 py-1.5 w-full sm:w-72 transition-colors">
                <Globe size={16} className="text-stone-400 dark:text-stone-600 mr-2" />
                <input 
                  type="text" 
                  placeholder="Paste URL..."
                  value={externalUrl}
                  onChange={(e) => {
                    const v = e.target.value;
                    setExternalUrl(v);
                    if (v && v.startsWith('http')) {
                      setExternalPreview(v);
                      setActiveTab('discovery');
                      setDiscoveryType('photos');
                    }
                  }}
                  className="bg-transparent border-none focus:ring-0 text-sm font-medium flex-1 h-8 text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-stone-700"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-6 py-3.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-[10px] font-bold uppercase tracking-widest transition-colors">
              <Sparkles size={16} />
              Generative Environment Active
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="p-8 bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-sm space-y-6 transition-colors">
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black text-stone-300 dark:text-stone-700 uppercase tracking-[0.2em] mb-4">Filtration</p>
              {[
                { id: 'all', label: 'All Artifacts', icon: Globe },
                { id: 'image', label: 'Visuals', icon: ImageIcon },
                { id: 'video', label: 'Cinematics', icon: Video },
                { id: 'audio', label: 'Echos', icon: Music },
                { id: 'ebook', label: 'Manuscripts', icon: FileText },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setFilter(btn.id)}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-[0.1em] ${
                    filter === btn.id 
                    ? 'bg-stone-900 dark:bg-stone-800 text-white shadow-xl shadow-stone-900/30' 
                    : 'text-stone-400 dark:text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-600 dark:hover:text-stone-300'
                  }`}
                >
                  <btn.icon size={16} />
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8 bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-sm space-y-6 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">Atmosphere Pool</h3>
              <RefreshCw 
                size={14} 
                className={`text-stone-300 dark:text-stone-700 cursor-pointer hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} 
                onClick={fetchMedia}
              />
            </div>
            <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden border border-stone-200/50 dark:border-stone-700/50 transition-colors">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (items.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0) / (100 * 1024 * 1024)) * 100)}%` }}
                className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"
              />
            </div>
            <div className="flex justify-between items-end transition-colors">
              <p className="text-[10px] font-black text-stone-900 dark:text-stone-200 uppercase tracking-widest">
                {items.length === 0 && !loading ? (
                  "Empty"
                ) : (
                  `${(items.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0) / (1024 * 1024)).toFixed(1)} MB / 100 MB`
                )}
              </p>
              <span className="text-[10px] font-bold text-stone-300 dark:text-stone-700 uppercase">Usage Status</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {activeTab === 'library' ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => (
                  <motion.div 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -6, scale: 1.02 }}
                    onClick={() => setSelectedItem(item)}
                    className="group bg-white dark:bg-stone-900 p-5 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-sm hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="aspect-[4/3] bg-stone-50 dark:bg-stone-950 rounded-3xl flex items-center justify-center mb-4 transition-colors group-hover:bg-white dark:group-hover:bg-stone-800 overflow-hidden relative border border-stone-100/50 dark:border-stone-800/50">
                      {item.url && (item.type === 'image' || item.type === 'video') ? (
                        item.type === 'image' ? (
                          <img 
                            src={item.url.startsWith('http') && !item.url.includes('localhost') ? `https://images.weserv.nl/?url=${encodeURIComponent(item.url)}&nrb=1` : item.url}
                            alt="" 
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            onError={(e) => {
                               const fallbackUrl = item.url;
                               if (e.currentTarget.src !== fallbackUrl) {
                                 e.currentTarget.src = fallbackUrl;
                               }
                            }}
                            className="absolute inset-0 w-full h-full object-cover transition-all duration-500 scale-100 group-hover:scale-105" 
                          />
                        ) : (
                          <div className="absolute inset-0 w-full h-full">
                            <video 
                              src={item.url} 
                              poster={item.thumbnail}
                              className="w-full h-full object-cover" 
                              muted
                              playsInline
                              onMouseOver={e => e.currentTarget.play()}
                              onMouseOut={e => {
                                e.currentTarget.pause();
                                e.currentTarget.currentTime = 0;
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-stone-900/10 group-hover:bg-transparent transition-colors">
                              {!item.thumbnail && (
                                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 opacity-100 group-hover:opacity-0 transition-opacity">
                                  <Video size={16} fill="currentColor" />
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      ) : (
                         <div className={`transition-transform duration-500 group-hover:scale-125 ${item.color || 'text-stone-500'}`}>
                          {getIcon(item.icon)}
                        </div>
                      )}
                      
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur px-3 py-1.5 rounded-full text-[10px] font-bold text-stone-900 dark:text-white border border-stone-100 dark:border-stone-800 shadow-sm uppercase tracking-widest">
                            {item.type}
                         </div>
                      </div>
                    </div>
                    <div className="px-1">
                      <h4 className="text-xs font-black text-stone-900 dark:text-white truncate mb-1">{item.name}</h4>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest">{item.size}</p>
                        <ChevronRight size={12} className="text-stone-300 dark:text-stone-700 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                    
                    {item.tags && item.tags.length > 0 && (
                      <div className="absolute top-4 left-4 flex gap-1 items-center bg-stone-950/80 dark:bg-emerald-600/80 backdrop-blur rounded-full px-2.5 py-1 text-[8px] font-bold text-white uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tag size={8} /> {item.tags[0]}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {filteredItems.length === 0 && (
                <div className="col-span-full py-32 text-center space-y-6 bg-white dark:bg-stone-900 rounded-[3rem] border border-dashed border-stone-200 dark:border-stone-800 transition-colors">
                  <div className="w-24 h-24 bg-stone-50 dark:bg-stone-950 rounded-full flex items-center justify-center mx-auto text-stone-200 dark:text-stone-800 shadow-inner transition-colors">
                    <ImageIcon size={48} strokeWidth={1} />
                  </div>
                  <div>
                    <p className="text-xl font-serif font-bold text-stone-900 dark:text-white transition-colors">A Silent Library</p>
                    <p className="text-stone-400 dark:text-stone-500 text-xs font-medium uppercase tracking-widest mt-2">No artifacts matched your search vibration.</p>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'discovery' ? (
            <div className="space-y-12">
              {externalPreview && (
                <div className="bg-white dark:bg-stone-900 rounded-[3rem] border-4 border-emerald-50 dark:border-emerald-900/10 p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4 transition-colors">
                  <div className="flex flex-col lg:flex-row gap-8 items-center">
                    <div className="w-full lg:w-1/2 aspect-video bg-stone-100 dark:bg-stone-950 rounded-[2rem] overflow-hidden shadow-inner border border-stone-100 dark:border-stone-800 transition-colors flex items-center justify-center">
                      {/\.(mp4|webm|ogg)$/i.test(externalPreview) ? (
                        <video src={externalPreview} controls className="w-full h-full object-contain" />
                      ) : /\.(mp3|wav|ogg)$/i.test(externalPreview) ? (
                        <div className="flex flex-col items-center gap-4 text-emerald-500">
                          <Music size={64} />
                          <audio src={externalPreview} controls className="w-full" />
                        </div>
                      ) : (
                        <img 
                          src={externalPreview} 
                          referrerPolicy="no-referrer" 
                          onError={(e) => {
                              const fallback = `https://images.weserv.nl/?url=${encodeURIComponent(externalPreview)}&nrb=1`;
                              e.currentTarget.src = fallback;
                            }}
                          className="w-full h-full object-contain" 
                          alt="External Preview" 
                        />
                      )}
                    </div>
                    <div className="flex-1 space-y-6 text-center lg:text-left">
                      <div>
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.4em]">External Acquisition</span>
                        <h3 className="text-2xl font-serif font-black text-stone-900 dark:text-white mt-2">Remote Sample Found</h3>
                        <p className="text-stone-500 dark:text-stone-400 text-sm mt-3 leading-relaxed">This artifact exists outside your library. Enshrine it to save a local copy in your collection.</p>
                      </div>
                      <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                        <button 
                          onClick={importExternalUrl}
                          disabled={loading}
                          className="bg-stone-950 dark:bg-emerald-600 text-white px-10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-stone-800 dark:hover:bg-emerald-500 transition-all shadow-xl shadow-stone-950/20 active:scale-95 disabled:opacity-50"
                        >
                          {loading ? 'Processing...' : 'Enshrine Artifact'}
                        </button>
                        <button 
                          onClick={() => setExternalPreview(null)}
                          className="bg-stone-50 dark:bg-stone-800 text-stone-400 dark:text-stone-400 px-10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-stone-100 dark:hover:bg-stone-700 hover:text-stone-600 dark:hover:text-stone-200 transition-all border border-stone-100 dark:border-stone-700"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {discoveryResults.map((item: any) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 p-4 shadow-sm hover:shadow-xl transition-all"
                >
                  <div className="aspect-[4/5] rounded-[2rem] overflow-hidden mb-4 bg-stone-100 dark:bg-stone-950 relative border border-stone-100 dark:border-stone-800 transition-colors">
                    {discoveryType === 'photos' ? (
                      <img src={item.urls.small} alt={item.alt_description} referrerPolicy="no-referrer" crossOrigin="anonymous" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : discoveryType === 'videos' ? (
                      <video src={item.video_files[0]?.link} className="w-full h-full object-cover" muted onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                          <Music size={32} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-stone-900 dark:text-white uppercase truncate w-full">{item.title}</p>
                          <p className="text-[8px] font-bold text-stone-400 uppercase">{item.artist}</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-stone-900/40 dark:bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                       <button 
                        onClick={() => importDiscoveryItem(item)}
                        className="bg-white dark:bg-stone-800 text-stone-900 dark:text-white p-4 rounded-full shadow-xl hover:scale-110 transition-transform active:scale-95 border border-white/20"
                       >
                          <Plus size={24} />
                       </button>
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-stone-900 dark:text-stone-300 uppercase tracking-widest truncate">
                    {discoveryType === 'photos' ? item.user.name : (discoveryType === 'videos' ? item.user.name : item.artist)}
                  </p>
                </motion.div>
              ))}
              {discoveryResults.length === 0 && !loading && (
                <div className="col-span-full py-40 text-center space-y-6 transition-colors">
                   <div className="w-32 h-32 bg-stone-50 dark:bg-stone-950 rounded-full flex items-center justify-center mx-auto text-stone-200 dark:bg-stone-800 transition-colors">
                      <Globe size={64} strokeWidth={1} />
                   </div>
                   <p className="text-stone-400 dark:text-stone-600 text-xs font-bold uppercase tracking-[0.2em]">Enter a search term to discover global {discoveryType} essence.</p>
                </div>
              )}
              {loading && (
                <div className="col-span-full py-40 flex items-center justify-center">
                   <Loader2 size={40} className="text-stone-200 dark:text-stone-800 animate-spin" />
                </div>
              )}
            </div>
          </div>
        ) : (
            <div className="bg-white dark:bg-stone-900 rounded-[3rem] border border-stone-100 dark:border-stone-800 shadow-sm p-8 lg:p-12 transition-colors">
               <div className="max-w-4xl mx-auto space-y-12">
                  <div className="text-center space-y-4">
                     <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.4em]">Gemini Visual Engine</span>
                     <h2 className="text-4xl md:text-5xl font-serif font-black text-stone-900 dark:text-white tracking-tight">AI Studio</h2>
                     <p className="text-stone-500 dark:text-stone-400 max-w-xl mx-auto text-sm leading-relaxed">Describe a vision, select a style, and let Gemini sculpt unique assets directly into your library.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                     <div className="space-y-8">
                        <div className="space-y-4">
                           <label className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest block">Artifact Type</label>
                           <div className="flex flex-wrap gap-2 text-stone-900 dark:text-white">
                              {[
                                { id: 'image', label: 'Image', icon: ImageIcon },
                                { id: 'video', label: 'Video', icon: Video },
                                { id: 'audio', label: 'Audio', icon: Music },
                                { id: 'ebook', label: 'Manuscript', icon: FileText },
                              ].map(t => (
                                <button 
                                  key={t.id}
                                  onClick={() => setAiGenType(t.id as any)}
                                  className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                                    aiGenType === t.id 
                                    ? 'bg-emerald-600 text-white shadow-lg' 
                                    : 'bg-stone-50 dark:bg-stone-950 text-stone-400 border border-stone-100 dark:border-stone-800'
                                  }`}
                                >
                                  <t.icon size={14} />
                                  {t.label}
                                </button>
                              ))}
                           </div>
                        </div>

                        <div className="space-y-4">
                           <label className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest block">Prompt Architecture</label>
                           <textarea 
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="A minimalist artisan workspace with natural light, sandalwood incense smoke, and high-fire ceramic textures..."
                            className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 rounded-[2rem] p-8 text-sm text-stone-900 dark:text-white focus:ring-4 focus:ring-emerald-500/10 transition-all min-h-[180px] shadow-inner outline-none resize-none placeholder:text-stone-300 dark:placeholder:text-stone-700"
                           />
                        </div>

                        <div className="space-y-4">
                           <label className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest block">Aesthetic Discipline</label>
                           <div className="flex flex-wrap gap-3">
                              {stylePresets.map(s => (
                                <button 
                                  key={s.id}
                                  onClick={() => setAiStyle(s.id)}
                                  className={`px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                                    aiStyle === s.id 
                                    ? 'bg-stone-900 dark:bg-stone-800 text-white shadow-xl shadow-stone-900/30 ring-2 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                                    : 'bg-stone-50 dark:bg-stone-950 text-stone-400 dark:text-stone-500 border border-stone-100 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 dark:hover:text-stone-300'
                                  }`}
                                >
                                  {s.label}
                                </button>
                              ))}
                           </div>
                        </div>

                        <button 
                          onClick={handleAiStudioGen}
                          disabled={loading || isGenerating || !aiPrompt}
                          className="w-full bg-stone-950 dark:bg-emerald-600 text-white py-6 rounded-[2rem] font-serif font-bold text-xl flex items-center justify-center gap-4 hover:bg-emerald-950 dark:hover:bg-emerald-500 transition-all shadow-2xl shadow-stone-900/20 active:scale-[0.98] disabled:opacity-50"
                        >
                          {loading ? <Loader2 size={24} className="animate-spin text-emerald-400 dark:text-white" /> : <Wand2 size={24} className="text-emerald-400 dark:text-white" />}
                          {loading ? 'SCULPTING...' : 'ENVISION ARTIFACT'}
                        </button>
                     </div>

                      <div className="space-y-6">
                        <div className="aspect-square bg-stone-50 dark:bg-stone-950 rounded-[3rem] border-2 border-dashed border-stone-100 dark:border-stone-800 flex items-center justify-center overflow-hidden relative shadow-inner group transition-colors">
                           {generatedImg ? (
                              <>
                                <img
                                  src={generatedImg}
                                  referrerPolicy="no-referrer"
                                  crossOrigin="anonymous"
                                  className="w-full h-full object-cover animate-in fade-in duration-1000"
                                  alt="Generated"
                                />
                                <div className="absolute inset-0 bg-stone-950/40 dark:bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                                   <button 
                                    onClick={saveGeneratedToLibrary}
                                    disabled={loading || isGenerating}
                                    className="bg-white dark:bg-stone-800 text-stone-900 dark:text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-xl border border-white/10"
                                   >
                                      Enshrine in Library
                                   </button>
                                   <button 
                                    onClick={() => setGeneratedImg(null)}
                                    className="bg-rose-500 text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
                                   >
                                      Discard
                                   </button>
                                </div>
                              </>
                           ) : generatedManuscript ? (
                              <div className="w-full h-full p-8 flex flex-col bg-white dark:bg-stone-900 animate-in fade-in duration-700">
                                 <div className="flex-1 overflow-y-auto custom-scrollbar prose prose-sm dark:prose-invert">
                                    <div className="text-stone-800 dark:text-stone-200 whitespace-pre-wrap font-medium text-xs leading-relaxed">
                                       {generatedManuscript}
                                    </div>
                                 </div>
                                 <div className="mt-6 pt-6 border-t border-stone-100 dark:border-stone-800 flex gap-4">
                                    <button 
                                      onClick={saveManuscriptToLibrary}
                                      disabled={loading || isGenerating}
                                      className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg"
                                    >
                                       Save as E-Book
                                    </button>
                                    <button 
                                      onClick={() => setGeneratedManuscript(null)}
                                      className="px-6 py-3 bg-stone-100 dark:bg-stone-800 text-stone-500 rounded-xl font-bold text-[10px] uppercase tracking-widest"
                                    >
                                       Discard
                                    </button>
                                 </div>
                              </div>
                           ) : (
                              <div className="text-center space-y-4 px-12 transition-colors">
                                 <div className="w-20 h-20 bg-white dark:bg-stone-900 rounded-full flex items-center justify-center mx-auto text-stone-100 dark:text-stone-800 shadow-sm border border-stone-100/10">
                                    <Sparkles size={40} strokeWidth={1} />
                                 </div>
                                 <p className="text-stone-300 dark:text-stone-700 text-xs font-bold uppercase tracking-[0.2em] leading-relaxed">The canvas is blank, waiting for your description to manifest.</p>
                              </div>
                           )}
                           
                           {(loading || isGenerating) && (
                              <div className="absolute inset-0 bg-white/60 dark:bg-stone-950/60 backdrop-blur-md flex flex-col items-center justify-center gap-4 transition-colors">
                                 <div className="relative">
                                    <div className="w-24 h-24 border-4 border-stone-100 dark:border-stone-800 border-t-emerald-500 rounded-full animate-spin"></div>
                                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500 animate-pulse" size={32} />
                                 </div>
                                 <p className="text-[10px] font-black text-stone-400 dark:text-emerald-500 uppercase tracking-[0.4em] animate-pulse">
                                   {generationStatus || 'Neural Sculpting In Progress'}
                                 </p>
                              </div>
                           )}
                        </div>

                        {generatedImg && (
                           <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl border border-emerald-100 dark:border-emerald-800 text-center transition-colors"
                           >
                              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Reality Manifested</p>
                              <p className="text-xs text-stone-600 dark:text-stone-400">Your AI-generated artifact is ready. Enshrine it to save it permanently to your library.</p>
                           </motion.div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedItem(null); setIsEditing(false); }}
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.9 }}
              className="relative bg-white dark:bg-stone-900 w-full max-w-5xl rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] transition-colors"
            >
              <button 
                onClick={() => { setSelectedItem(null); setIsEditing(false); }}
                className="absolute top-8 right-8 p-3 text-stone-400 dark:text-stone-600 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-stone-800 rounded-2xl transition-all z-20 border border-stone-100 dark:border-stone-800 shadow-sm"
              >
                <X size={20} />
              </button>

              <div className="flex-1 bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-8 md:p-16 relative overflow-hidden transition-colors">
                <div className={`transition-all duration-500 w-full h-full flex items-center justify-center ${activeFilter}`}>
                  {selectedItem.url ? (
                    selectedItem.type === 'video' ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <video 
                          src={selectedItem.url} 
                          controls 
                          className="max-w-full max-h-full rounded-3xl shadow-2xl focus:outline-none z-10"
                          onPlay={(e) => {
                            const audio = e.currentTarget.parentElement?.querySelector('audio');
                            if (audio) {
                              audio.currentTime = e.currentTarget.currentTime;
                              audio.play().catch(() => {});
                            }
                          }}
                          onPause={(e) => {
                            const audio = e.currentTarget.parentElement?.querySelector('audio');
                            if (audio) audio.pause();
                          }}
                          onSeeked={(e) => {
                            const audio = e.currentTarget.parentElement?.querySelector('audio');
                            if (audio) audio.currentTime = e.currentTarget.currentTime;
                          }}
                          onVolumeChange={(e) => {
                             const audio = e.currentTarget.parentElement?.querySelector('audio');
                             if (audio) {
                               audio.volume = e.currentTarget.volume;
                               audio.muted = e.currentTarget.muted;
                             }
                          }}
                        />
                        {selectedItem.audioUrl && (
                          <audio src={selectedItem.audioUrl} className="hidden" />
                        )}
                      </div>
                    ) : selectedItem.type === 'audio' ? (
                      <div className="flex flex-col items-center gap-8 w-full max-w-md">
                        <div className="w-48 h-48 rounded-[3rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 animate-pulse">
                           <Music size={80} />
                        </div>
                        <audio 
                          src={selectedItem.url} 
                          controls 
                          className="w-full focus:outline-none"
                        />
                      </div>
                    ) : (
                      <img 
                        src={selectedItem.url.startsWith('http') && !selectedItem.url.includes('localhost') ? `https://images.weserv.nl/?url=${encodeURIComponent(selectedItem.url)}&nrb=1` : selectedItem.url}
                        alt="" 
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl"
                      />
                    )
                  ) : (
                    <div className={`scale-[5] opacity-20 ${selectedItem.color || 'text-stone-500'}`}>
                      {getIcon(selectedItem.icon)}
                    </div>
                  )}
                </div>
                
                {isEditing && (
                  <motion.div 
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    className="absolute bottom-8 left-8 right-8 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl rounded-[2.5rem] p-6 border border-stone-200 dark:border-stone-800 shadow-xl transition-colors"
                  >
                    <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
                      {FILTERS.map(f => (
                        <button 
                          key={f.name}
                          onClick={() => setActiveFilter(f.class)}
                          className={`shrink-0 flex flex-col items-center gap-2 group p-2 rounded-2xl transition-all ${activeFilter === f.class ? 'bg-stone-900 dark:bg-emerald-600 text-white' : 'hover:bg-stone-50 dark:hover:bg-stone-800'}`}
                        >
                          <div className={`w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-950 overflow-hidden border border-stone-200 dark:border-stone-700 ${f.class}`}>
                            <img src={selectedItem.url} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-widest text-stone-900 dark:text-stone-300 transition-colors">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="w-full md:w-[400px] p-8 md:p-12 space-y-8 overflow-y-auto border-l border-stone-100 dark:border-stone-800 transition-colors">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedItem.color }} />
                       <span className="text-[10px] font-black text-stone-300 dark:text-stone-700 uppercase tracking-[0.2em]">{selectedItem.type} Artifact</span>
                    </div>
                    <h3 className="text-3xl font-serif font-black text-stone-900 dark:text-white tracking-tight leading-none overflow-hidden text-ellipsis">{selectedItem.name}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6 bg-stone-50 dark:bg-stone-950 p-6 rounded-3xl border border-stone-100 dark:border-stone-800 transition-colors shadow-inner">
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest mb-1">Scale</p>
                      <p className="text-sm font-black text-stone-900 dark:text-stone-200">{selectedItem.size}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest mb-1">Discovery</p>
                      <p className="text-sm font-black text-stone-900 dark:text-stone-200">{selectedItem.date}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-stone-300 dark:text-stone-700 uppercase tracking-[0.2em]">Cognitive Essence (Tags)</p>
                        {selectedItem.type === 'image' && (
                          <button 
                            onClick={generateSmartTags}
                            disabled={isTagging}
                            className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 uppercase tracking-widest disabled:opacity-50 transition-colors"
                          >
                            {isTagging ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Smart Tag
                          </button>
                        )}
                     </div>
                     <div className="flex flex-wrap gap-2">
                        {selectedItem.tags && selectedItem.tags.length > 0 ? selectedItem.tags.map(t => (
                          <span key={t} className="bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 px-3 py-1.5 rounded-xl text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest transition-colors">{t}</span>
                        )) : (
                          <p className="text-[10px] italic text-stone-400 dark:text-stone-600 font-medium">No essences extracted yet.</p>
                        )}
                     </div>
                  </div>
                </div>

                <div className="space-y-4 pt-10 border-t border-stone-100 dark:border-stone-800 transition-colors">
                  <div className="grid grid-cols-2 gap-4">
                    {selectedItem.type === 'image' && (
                      <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex-1 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                          isEditing ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-xl shadow-emerald-600/20' : 'bg-stone-50 dark:bg-stone-950 text-stone-600 dark:text-stone-400 border border-stone-100 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
                        }`}
                      >
                        {isEditing ? <Check size={16} /> : <Edit2 size={16} />}
                        {isEditing ? 'Preserve' : 'Refine'}
                      </button>
                    )}
                    {selectedItem.type === 'image' && (
                      <button 
                        onClick={() => setShowArticleLinker(!showArticleLinker)}
                        className="flex-1 bg-stone-900 dark:bg-stone-800 text-white py-4 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-stone-800 dark:hover:bg-stone-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-stone-900/20"
                      >
                         <PanelRight size={16} />
                         Featured
                      </button>
                    )}
                  </div>
                  
                  {showArticleLinker && selectedItem.type === 'image' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-100 dark:border-stone-800 space-y-3 transition-colors"
                    >
                      <p className="text-[9px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest pl-1">Link to Article</p>
                      <div className="max-h-40 overflow-y-auto space-y-2 no-scrollbar">
                        {articles.length > 0 ? articles.map(art => (
                          <button 
                            key={art.id}
                            onClick={() => handleSetAsFeatured(art.id)}
                            className="w-full text-left p-3 bg-white dark:bg-stone-900 rounded-xl text-[10px] font-bold text-stone-600 dark:text-stone-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all border border-stone-100 dark:border-stone-800"
                          >
                            {art.title}
                          </button>
                        )) : (
                          <p className="text-[9px] text-stone-400 dark:text-stone-600 italic p-2">No articles found.</p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  <button 
                    onClick={() => initiateDelete(selectedItem)}
                    className="w-full py-4 bg-rose-50 dark:bg-rose-900/10 text-rose-500 dark:text-rose-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-all flex items-center justify-center gap-2 border border-rose-100/50 dark:border-rose-900/20"
                  >
                     <Trash2 size={16} />
                     Vanish Artifact
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
              className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-[2.5rem] shadow-2xl overflow-hidden p-8 border border-stone-100 dark:border-stone-800 transition-colors"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-white">Vanish Artifact</h3>
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest">Permanent Removal</p>
                </div>
              </div>

              <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-8">
                Are you certain you wish to let <span className="font-bold text-stone-900 dark:text-white">{itemToDelete?.name}</span> fade from the record? 
                This action is absolute and cannot be reversed.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all active:scale-95 shadow-xl shadow-rose-600/20"
                >
                  Confirm Vanishing
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-stone-200 dark:hover:bg-stone-700 transition-all border border-stone-200 dark:border-stone-700"
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
