/**
 * Blog Post Detail View
 * Renders full article content with interactive features like comments and sharing.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, User, Share2, MessageSquare, Send, BarChart2, Clock, Loader2 } from 'lucide-react';
import Logo from '../components/Logo';
import { formatDistanceToNow } from 'date-fns';

const safeFormatDistanceToNow = (date: any) => {
  if (!date) return 'just now';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'just now';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch (e) {
    return 'just now';
  }
};

export default function BlogPost() {
  const { slug } = useParams();
  const { profile } = useAuth();
  const [post, setPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPost = async () => {
    try {
      const data = await api.posts.get(slug!);
      if (data) {
        setPost(data);
      }
    } catch (err) {
      console.error('Failed to fetch post:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [slug]);

  useEffect(() => {
    if (!post?._id) return;

    const actualId = post._id;

    // Track view
    const trackView = async () => {
      try {
        await api.posts.trackView(actualId);

        // Add to user's history if logged in
        if (profile) {
           const userId = profile._id || profile.id;
           const visitData = {
            postId: actualId,
            title: post.title,
            category: post.category,
            visitedAt: new Date().toISOString()
          };
          
          const updatedHistory = [...(profile.recentHistory || []), visitData].slice(-10);
          await api.users.update(userId, { recentHistory: updatedHistory });
        }
      } catch (err) {
        console.error("Tracking view error:", err);
      }
    };
    trackView();

    // Track time spent
    const startTime = Date.now();
    return () => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      if (timeSpent > 2) {
        api.posts.trackTime(actualId, timeSpent).catch(err => console.error("Tracking time error:", err));
      }
    };
  }, [post?._id]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !profile || !post?._id) return;

    setIsSubmitting(true);
    try {
      await api.posts.addComment(post._id, {
        content: newComment,
        authorName: profile.displayName || profile.email?.split('@')[0] || 'Anonymous',
        authorAvatar: profile.avatarUrl || profile.photoURL || '',
      });
      setNewComment('');
      fetchPost(); // Refresh post to get new comments
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Failed to post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
        <p className="text-xs font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest">Gathering the elements...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-8 text-center text-stone-900 dark:text-white font-display transition-colors duration-300">
        <Logo size={120} className="mb-8 opacity-20" />
        <h1 className="text-4xl font-serif font-bold mb-4">Post Not Found</h1>
        <p className="text-stone-500 dark:text-stone-400 mb-8 max-w-md">The story you're looking for has drifted away into the digital forest.</p>
        <Link to="/blog" className="bg-stone-900 dark:bg-white text-white dark:text-stone-950 px-8 py-3 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-stone-800 dark:hover:bg-stone-100 transition-all">Return to Library</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 selection:bg-emerald-100 dark:selection:bg-emerald-900 selection:text-emerald-900 dark:selection:text-emerald-100 transition-colors duration-300">
      <nav className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <Logo size={28} />
          <span className="text-xl md:text-2xl font-black text-stone-900 dark:text-white tracking-tight font-serif">Page Pilot <span className="text-emerald-600">CMS</span></span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/blog" className="text-stone-400 dark:text-stone-500 hover:text-stone-900 dark:hover:text-white font-black tracking-[0.2em] text-[10px] uppercase flex items-center gap-2 transition-colors">
            <ArrowLeft size={16} /> Blogs
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-8 py-20">
        <motion.header 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center max-w-4xl mx-auto"
        >
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="bg-stone-900 dark:bg-emerald-700 text-white text-[10px] font-black uppercase font-bold tracking-[0.2em] px-4 py-1.5 rounded-full">
              {post.category || 'Stories'}
            </span>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] text-stone-500 dark:text-stone-600 font-black uppercase tracking-widest">
              Approx. 5 min read
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-black text-stone-900 dark:text-white leading-[1.02] mb-12 tracking-tighter transition-colors">
            {post.title}
          </h1>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 py-10 border-y border-stone-100 dark:border-stone-900 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-600 overflow-hidden shadow-inner border border-stone-200/50 dark:border-stone-800 transition-colors">
                {post.authorPhotoURL ? (
                  <img src={post.authorPhotoURL} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <User size={24} />
                )}
              </div>
              <div className="text-left font-sans">
                <p className="text-[10px] font-black text-stone-300 dark:text-stone-700 uppercase tracking-widest leading-none mb-1 transition-colors">Written by</p>
                <p className="text-base font-black text-stone-900 dark:text-stone-100 leading-none transition-colors">Page Pilot Team</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-8 bg-stone-100 dark:bg-stone-900"></div>
            <div className="text-center md:text-left font-sans">
                <p className="text-[10px] font-black text-stone-300 dark:text-stone-700 uppercase tracking-widest leading-none mb-1 transition-colors">Published</p>
                <p className="text-base font-serif font-black text-stone-900 dark:text-stone-100 leading-none transition-colors">
                  {post.createdAt ? new Date(post.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Draft'}
                </p>
            </div>
            <div className="hidden md:block w-px h-8 bg-stone-100 dark:bg-stone-900"></div>
            <div className="flex gap-2">
              <button className="w-11 h-11 rounded-2xl bg-white dark:bg-stone-900 text-stone-400 hover:text-emerald-600 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all active:scale-95 flex items-center justify-center border border-stone-100 dark:border-stone-800 shadow-sm">
                <Share2 size={18} />
              </button>
              <button className="w-11 h-11 rounded-2xl bg-white dark:bg-stone-900 text-stone-400 hover:text-emerald-600 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all active:scale-95 flex items-center justify-center border border-stone-100 dark:border-stone-800 shadow-sm">
                <BarChart2 size={18} />
              </button>
            </div>
          </div>
        </motion.header>

        {post.featuredImage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="aspect-[21/10] bg-stone-100 rounded-[3rem] overflow-hidden mb-20 shadow-2xl shadow-stone-200 border border-stone-100/50"
          >
            <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </motion.div>
        )}

        <div className="max-w-2xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rich-text-content prose prose-stone dark:prose-invert prose-xl max-w-none 
              prose-headings:font-serif prose-headings:font-bold prose-headings:tracking-tight
              prose-p:leading-relaxed prose-p:text-stone-700 dark:prose-p:text-stone-300 prose-p:mb-8
              prose-blockquote:font-serif prose-blockquote:italic prose-blockquote:text-stone-900 dark:prose-blockquote:text-stone-100 prose-blockquote:border-emerald-500
              prose-a:text-emerald-600 prose-strong:text-stone-900 dark:prose-strong:text-white
              prose-img:rounded-[2rem] prose-img:shadow-lg transition-colors duration-300"
          >
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          </motion.div>
        </div>

        {/* Comment Section */}
        <section className="mt-20 pt-12 border-t border-stone-200 dark:border-stone-900 transition-colors">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <MessageSquare size={20} />
            </div>
            <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-white">Conversations</h2>
            <span className="text-stone-400 dark:text-stone-600 font-medium">({post.comments?.length || 0})</span>
          </div>

          {profile ? (
            <form onSubmit={handleSubmitComment} className="mb-12">
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all shadow-sm">
                <textarea 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full h-24 bg-transparent text-stone-600 dark:text-stone-300 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none resize-none text-[15px] leading-relaxed font-medium transition-colors"
                />
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-50 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden border border-stone-200/50 dark:border-stone-800 transition-colors">
                      {(profile.avatarUrl || profile.photoURL) && <img src={profile.avatarUrl || profile.photoURL} referrerPolicy="no-referrer" className="w-full h-full object-cover" />}
                    </div>
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-600 font-display transition-colors">Posting as {profile.displayName || profile.email?.split('@')[0]}</span>
                  </div>
                  <button 
                    disabled={isSubmitting || !newComment.trim()}
                    className="bg-stone-900 dark:bg-emerald-600 text-white dark:text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-stone-800 dark:hover:bg-emerald-500 transition-all disabled:opacity-50 active:scale-95 font-display tracking-widest uppercase"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Post Comment</>}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="p-10 bg-stone-100 dark:bg-stone-900 rounded-[2rem] text-center mb-12 border border-stone-200/50 dark:border-stone-800 transition-colors">
              <p className="text-stone-600 dark:text-stone-400 font-medium mb-6">You must be signed in to join the conversation.</p>
              <Link to="/login" className="bg-stone-900 dark:bg-white text-white dark:text-stone-950 px-8 py-3 rounded-2xl text-xs font-bold hover:bg-stone-800 dark:hover:bg-stone-100 transition-all uppercase tracking-widest font-display">
                Sign In to Comment
              </Link>
            </div>
          )}

          <div className="space-y-8">
            <AnimatePresence mode="popLayout">
              {(post.comments || []).map((comment: any, i: number) => (
                <motion.div 
                  key={comment._id || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-stone-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-100/50 dark:border-stone-800 overflow-hidden transition-colors">
                    {comment.authorAvatar ? (
                      <img src={comment.authorAvatar} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                       <h4 className="text-sm font-bold text-stone-900 dark:text-white font-display transition-colors">{comment.authorName}</h4>
                       <span className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest font-display transition-colors">
                         {safeFormatDistanceToNow(comment.createdAt)}
                       </span>
                    </div>
                    <div className="text-[15px] text-stone-600 dark:text-stone-400 leading-relaxed bg-white dark:bg-stone-900 p-5 rounded-[1.5rem] rounded-tl-none border border-stone-100 dark:border-stone-800 shadow-sm font-medium transition-colors">
                      {comment.content}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {(post.comments || []).length === 0 && (
              <div className="text-center py-16">
                 <div className="w-12 h-12 bg-stone-50 dark:bg-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-4 text-stone-300 dark:text-stone-800 ring-1 ring-stone-100 dark:ring-stone-800 transition-colors">
                    <MessageSquare size={20} />
                 </div>
                <p className="text-stone-400 dark:text-stone-700 text-sm font-bold uppercase tracking-widest italic transition-colors">The first word is yet to be sculpted.</p>
              </div>
            )}
          </div>
        </section>

        <footer className="mt-24 pt-12 border-t border-stone-200 dark:border-stone-900 text-center transition-colors">
            <div className="p-12 bg-stone-900 dark:bg-stone-950/40 border border-stone-800 rounded-[3rem] text-white overflow-hidden relative transition-colors shadow-2xl shadow-black/20">
                <Logo size={56} className="mx-auto mb-8 opacity-60" animated />
                <h3 className="text-3xl font-serif font-bold mb-4">Enjoyed this chronicle?</h3>
                <p className="text-emerald-100/60 mb-10 max-w-sm mx-auto text-sm leading-relaxed">Join our newsletter to receive the latest stories and sustainable design tips directly in your inbox.</p>
                <div className="flex justify-center gap-3 max-w-sm mx-auto relative z-10">
                    <Link to="/login" className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all active:scale-95 uppercase tracking-widest text-xs font-display inline-block">Subscribe</Link>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2"></div>
            </div>
        </footer>
      </main>
    </div>
  );
}
