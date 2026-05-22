/**
 * Blog Listing Page
 * Displays a curated feed of published articles with featured and regular layouts.
 */

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, User, Calendar, Loader2 } from 'lucide-react';
import Logo from '../components/Logo';

export default function Blog() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await api.posts.list({ status: 'published', limit: 20 });
        // MongoDB returns all, we might want to filter on server but let's be sure
        setPosts(data.filter((p: any) => p.status === 'published'));
      } catch (err) {
        console.error('Failed to fetch posts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 selection:bg-emerald-100 dark:selection:bg-emerald-900 selection:text-emerald-900 dark:selection:text-emerald-100 transition-colors duration-300">
      <nav className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <Logo size={28} />
          <span className="text-xl md:text-2xl font-black text-stone-900 dark:text-white tracking-tight font-serif">Page Pilot</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className="text-stone-400 dark:text-stone-500 hover:text-stone-900 dark:hover:text-white font-black tracking-[0.2em] text-[10px] uppercase transition-all">Home</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-8 py-16 md:py-24">
        <header className="mb-16 text-center">
          <h1 className="text-4xl md:text-6xl font-serif font-black text-stone-900 dark:text-white mb-6 tracking-tighter leading-[1.1]">
            Sculpted <span className="italic font-medium text-emerald-600">Stories.</span>
          </h1>
          <p className="text-stone-500 dark:text-stone-400 font-medium max-w-xl mx-auto leading-relaxed text-lg">
            Insights on sustainable design, digital craftsmanship, and the future of low-code AI development.
          </p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            <p className="text-xs font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest">Unfolding the library...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-stone-900 rounded-[3rem] border border-stone-200 dark:border-stone-800 transition-colors">
             <div className="w-16 h-16 bg-stone-50 dark:bg-stone-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-stone-200 dark:text-stone-700">
                <Logo size={40} className="grayscale opacity-20" />
             </div>
             <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-white mb-2">The Archive is Empty</h3>
             <p className="text-stone-400 dark:text-stone-500 text-sm">Return later to discover new sculptures in text.</p>
          </div>
        ) : (
          <div className="space-y-24">
            {posts.length > 0 && (
              <motion.article 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center group"
              >
                <div className="lg:col-span-7">
                  <Link to={`/blog/${posts[0].slug}`}>
                    <div className="aspect-[16/10] bg-stone-100 dark:bg-stone-900 rounded-[2.5rem] overflow-hidden relative shadow-2xl shadow-stone-200 dark:shadow-black/20 border border-stone-100 dark:border-stone-800 transition-colors">
                      {posts[0].featuredImage ? (
                        <img src={posts[0].featuredImage} alt={posts[0].title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-stone-50 dark:bg-stone-900">
                          <Logo size={120} className="opacity-10" />
                        </div>
                      )}
                      <div className="absolute top-6 left-6">
                        <span className="bg-emerald-600 text-white text-[10px] uppercase font-bold tracking-[0.2em] px-4 py-2 rounded-full shadow-lg font-display">
                          Featured Story
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
                <div className="lg:col-span-5 space-y-6">
                  <header>
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-display text-[10px] uppercase font-bold tracking-widest mb-4">
                      <span className="w-8 h-[1px] bg-emerald-600 dark:bg-emerald-400"></span> {posts[0].category || 'Craftsmanship'}
                    </div>
                    <Link to={`/blog/${posts[0].slug}`}>
                      <h2 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 dark:text-white leading-[1.1] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors mb-4">
                        {posts[0].title}
                      </h2>
                    </Link>
                    <div className="flex items-center gap-6 text-stone-400 dark:text-stone-500 text-[10px] font-bold uppercase tracking-widest">
                       <span className="flex items-center gap-2"><Calendar size={12} /> {posts[0].createdAt ? new Date(posts[0].createdAt).toLocaleDateString() : 'Draft'}</span>
                       <span className="flex items-center gap-2"><User size={12} /> Editor Choice</span>
                    </div>
                  </header>
                  <div className="text-stone-500 dark:text-stone-400 leading-relaxed text-lg font-sans line-clamp-3 rich-text-content"
                    dangerouslySetInnerHTML={{ __html: posts[0].excerpt || posts[0].content }} 
                  />
                  <Link 
                    to={`/blog/${posts[0].slug}`}
                    className="inline-flex items-center gap-4 text-stone-900 dark:text-white font-bold border-b-2 border-emerald-500 dark:border-emerald-700 pb-1 hover:pb-2 transition-all group/link"
                  >
                    Explore Chapter <ArrowRight size={18} className="group-hover/link:translate-x-2 transition-transform" />
                  </Link>
                </div>
              </motion.article>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-20">
              {posts.slice(1).map((post, i) => (
                <motion.article
                  key={post._id || post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group"
                >
                  <Link to={`/blog/${post.slug}`}>
                    <div className="aspect-[16/9] bg-stone-100 dark:bg-stone-900 rounded-[2rem] overflow-hidden mb-8 relative shadow-lg shadow-stone-200/50 dark:shadow-black/20 border border-stone-100 dark:border-stone-800 transition-colors">
                      {post.featuredImage ? (
                        <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-stone-50 dark:bg-stone-900">
                          <Logo size={48} className="opacity-10" />
                        </div>
                      )}
                      <div className="absolute bottom-4 left-4">
                        <span className="bg-white/90 dark:bg-stone-800/90 backdrop-blur-md text-stone-900 dark:text-white text-[9px] uppercase font-bold tracking-[0.15em] px-3 py-1.5 rounded-lg shadow-sm font-display transition-colors">
                          {post.category || 'Opinion'}
                        </span>
                      </div>
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-white mb-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors tracking-tight leading-tight">
                      {post.title}
                    </h2>
                    <div className="text-stone-500 dark:text-stone-400 leading-relaxed text-sm font-sans line-clamp-2 rich-text-content"
                      dangerouslySetInnerHTML={{ __html: post.excerpt || post.content }} 
                    />
                    <div className="flex items-center justify-between pt-6 border-t border-stone-100 dark:border-stone-900 transition-colors">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                        <span className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-300 dark:text-stone-700 font-display transition-colors overflow-hidden">
                          {post.authorPhotoURL ? <img src={post.authorPhotoURL} referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <User size={10} />}
                        </span>
                        {post.authorName || post.authorId?.substring(0, 8) || 'Staff'}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Read More</span>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
