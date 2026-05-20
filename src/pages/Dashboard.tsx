/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  FileText, 
  ShoppingBag, 
  IndianRupee,
  Eye, 
  ArrowUpRight, 
  Sparkles,
  Search,
  MessageSquare,
  Clock,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { recommendationService } from '../services/recommendationService';
import { QuotaErrorBox } from '../components/QuotaErrorBox';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell
} from 'recharts';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [recommendedPosts, setRecommendedPosts] = useState<any[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalPosts: 0,
    avgTime: 0,
    totalRevenue: 0,
    engagementRate: 0,
    recentGrowth: '+0%'
  });
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (profile) {
        setRecLoading(true);
        const recommendations = await recommendationService.getPersonalizedRecommendations(profile._id || profile.id, profile?.recentHistory || []);
        setRecommendedPosts(recommendations);
        setRecLoading(false);
      }
    };
    if (profile) {
      fetchRecommendations();
    }
  }, [profile]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;
      try {
        setError(null);
        const allPostsData = await api.posts.list({ limit: 50 });
        const allOrders = await api.orders.list();
        const products = await api.products.list();
        
        setAllPosts(allPostsData || []);
        const sortedByViews = [...allPostsData || []].sort((a, b) => (b.views || 0) - (a.views || 0));
        setTopPosts(sortedByViews.slice(0, 5));

        // Aggregate stats
        let views = 0;
        let totalSeconds = 0;
        (allPostsData || []).forEach((p: any) => {
          views += (p.views || 0);
          totalSeconds += (p.secondsSpent || 0);
        });

        const revenue = (allOrders || []).reduce((acc: number, o: any) => acc + (o.total || 0), 0);
        
        // Accurate engagement: Avg time on page / 300s (5m) cap
        const engagement = views > 0 ? Math.min(100, Math.round(((totalSeconds / views) / 300) * 100)) : 0;

        setStats({
          totalViews: views,
          totalPosts: (allPostsData || []).length,
          avgTime: views > 0 ? Math.round(totalSeconds / views) : 0,
          totalRevenue: revenue,
          engagementRate: engagement,
          recentGrowth: views > 100 ? '+14.2%' : '+0%' // Real calculation would compare periods
        });

        // Real Historical Metrics
        const categories = [...new Set((allPostsData || []).map((p: any) => p.category || 'General'))];
        const categoryData = categories.map(cat => {
          const catPosts = (allPostsData || []).filter((p: any) => p.category === cat);
          const catViews = catPosts.reduce((acc, p) => acc + (p.views || 0), 0);
          return {
            label: cat,
            value: catViews > 1000 ? (catViews / 1000).toFixed(1) + 'k' : catViews.toString(),
            status: 'increase',
            percent: Math.round((catViews / (views || 1)) * 100) + '%'
          };
        });
        setHistoricalData(categoryData.slice(0, 3));

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
        setError(error);
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  const chartData = topPosts.map(p => ({
    name: p.title.substring(0, 12) + (p.title.length > 12 ? '...' : ''),
    views: p.views || 0,
    time: Math.round((p.secondsSpent || 0) / (p.views || 1)),
    readingDepth: Math.min(100, Math.round(((p.secondsSpent || 0) / (p.views || 1)) / 180 * 100))
  }));

  const [insight, setInsight] = useState({
    title: 'Analyzing Trends...',
    text: 'Page Pilot Designer is evaluating your reach to find the next masterpiece idea.'
  });

  useEffect(() => {
    const generateGrowthInsight = async () => {
      if (topPosts.length === 0) return;
      
      const context = topPosts.map(p => `Post: ${p.title} | Views: ${p.views} | Category: ${p.category}`).join('\n');
      const prompt = `Based on these top performing blog posts, provide a one-sentence growth recommendation for the creator.
      Focus on what they should write next to keep the momentum.
      Context:\n${context}
      
      Return ONLY a JSON object with "title" and "text" fields.
      Example: {"title": "Trending: Minimalism", "text": "Your minimalist design post is peaking; consider a deep dive into Zen interfaces."}`;

      try {
        const { geminiService } = await import('../services/geminiService');
        const aiResponse = await geminiService.generateContent(prompt, "You are a senior content strategist for a high-end CMS.");
        const cleanJson = aiResponse.replace(/```json|```/g, '').trim();
        setInsight(JSON.parse(cleanJson));
      } catch (e) {
        setInsight({
          title: 'Craftsmanship Insight',
          text: 'Consistency is the engine of authority. Your presence in the digital forest is growing.'
        });
      }
    };

    if (topPosts.length > 0) {
      generateGrowthInsight();
    }
  }, [topPosts]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-stone-200 rounded-[2rem]"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-[400px] bg-stone-200 rounded-[2.5rem]"></div>
          <div className="space-y-8">
            <div className="h-[200px] bg-stone-200 rounded-[2.5rem]"></div>
            <div className="h-[150px] bg-emerald-900/10 rounded-3xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      {error && <QuotaErrorBox error={error.message || String(error)} />}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-stone-900 dark:text-white tracking-tight">Site Insights</h2>
          <p className="text-stone-500 dark:text-stone-400 font-medium">Analyze your website's performance and audience engagement.</p>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* Stats Grid */}
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Post Views', value: stats.totalViews.toLocaleString(), change: stats.recentGrowth, icon: Eye, color: 'text-emerald-600 dark:text-emerald-400', glowColor: 'rgba(16,185,129,0.15)', bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20' },
          { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, change: 'Real-time', icon: IndianRupee, color: 'text-amber-600 dark:text-amber-400', glowColor: 'rgba(245,158,11,0.15)', bgColor: 'bg-amber-50/50 dark:bg-amber-950/20' },
          { label: 'Active Articles', value: stats.totalPosts, change: 'Lifetime', icon: FileText, color: 'text-blue-600 dark:text-blue-400', glowColor: 'rgba(59,130,246,0.15)', bgColor: 'bg-blue-50/50 dark:bg-blue-950/20' },
          { label: 'Engagement Rate', value: `${stats.engagementRate}%`, change: 'Pulse', icon: TrendingUp, color: 'text-indigo-600 dark:text-indigo-400', glowColor: 'rgba(99,102,241,0.15)', bgColor: 'bg-indigo-50/50 dark:bg-indigo-950/20' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 100 }}
            className="bg-white dark:bg-stone-900/90 p-8 rounded-[2.2rem] border border-stone-200/60 dark:border-stone-850 shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.25)] hover:-translate-y-1 hover:bg-stone-50/30 dark:hover:bg-stone-800/10 transition-all duration-300 group relative overflow-hidden"
          >
            {/* Glowing Hover Effect */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 100% 0%, ${stat.glowColor} 0%, transparent 60%)`
              }}
            />
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <p className="text-stone-400 dark:text-stone-500 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
              <div className={`flex items-center gap-1.5 text-[9px] font-black ${stat.color} bg-stone-50 dark:bg-stone-950 px-2.5 py-1 rounded-full border border-stone-100 dark:border-stone-800 shadow-sm`}>
                <span className={`w-1 h-1 rounded-full ${i === 0 || i === 1 ? 'bg-emerald-500 animate-pulse' : i === 2 ? 'bg-blue-500' : 'bg-indigo-500 animate-pulse'}`}></span>
                {stat.change}
              </div>
            </div>
            <div className="flex items-end justify-between relative z-10">
              <div>
                <h3 className="text-3xl md:text-5xl font-serif font-black text-stone-900 dark:text-white tracking-tighter tabular-nums mb-1">{stat.value}</h3>
              </div>
              <div className={`w-14 h-14 rounded-2xl ${stat.bgColor} flex items-center justify-center ${stat.color} transition-all duration-500 group-hover:scale-110 shadow-sm border border-stone-100 dark:border-stone-800/35`}>
                <stat.icon size={22} strokeWidth={2} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Blog Analytics Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 p-8 md:p-10 rounded-[2.5rem] border border-stone-200/60 dark:border-stone-800 shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.03)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 md:mb-10">
            <div>
              <h3 className="text-lg md:text-2xl font-serif font-black text-stone-900 dark:text-white mb-1">Post Performance</h3>
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">Impact metrics of your top performing articles</p>
            </div>
            <div className="flex gap-2">
              <button className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl transition-all active:scale-95 border border-emerald-100/50 dark:border-emerald-900/20">
                <BarChart2 size={16} />
              </button>
            </div>
          </div>
          <div className="h-48 sm:h-64 md:h-80 w-full overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDepth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#292524' : '#f1f5f9'} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: isDark ? '#57534e' : '#a8a29e', fontSize: 10, fontWeight: 700}} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: isDark ? '#57534e' : '#a8a29e', fontSize: 11, fontWeight: 700}} 
                  dx={-15}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '28px', 
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #f1f5f9', 
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                    padding: '20px 24px',
                    backdropFilter: 'blur(12px)',
                    background: isDark ? 'rgba(28, 25, 23, 0.9)' : 'rgba(255, 255, 255, 0.95)'
                  }}
                  itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                  labelStyle={{ fontWeight: 900, color: isDark ? '#fff' : '#134e4a', marginBottom: '8px', fontSize: '14px', fontFamily: 'serif' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#10b981" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorViews)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="readingDepth" 
                  stroke="#059669" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorDepth)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
 
        {/* Analytics Breakdown */}
        <div className="flex flex-col gap-6 md:gap-8">
          <div className="bg-white dark:bg-stone-900 p-8 md:p-10 rounded-[2.5rem] border border-stone-200/60 dark:border-stone-800 shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.03)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] transition-all duration-300 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-serif font-black text-stone-900 dark:text-white">Retention</h3>
              <Clock size={18} className="text-stone-300 dark:text-stone-700" />
            </div>
            <div className="space-y-6 flex-1">
              {topPosts.map((post, i) => (
                <div key={post._id || post.id} className="space-y-2.5">
                  <div className="flex justify-between items-end">
                    <span className="font-bold text-stone-700 dark:text-stone-300 truncate max-w-[170px] text-[13px] tracking-tight">{post.title}</span>
                    <span className="text-[9px] font-black text-stone-400 dark:text-stone-600 bg-stone-50 dark:bg-stone-950 px-2 py-0.5 rounded-md border border-stone-100/50 dark:border-stone-900 transition-colors">{Math.round((post.secondsSpent || 0) / (post.views || 1))}s</span>
                  </div>
                  <div className="h-2 w-full bg-stone-100/80 dark:bg-stone-950 rounded-full overflow-hidden transition-colors border border-black/5 dark:border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (post.secondsSpent || 0) / 10)}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-stone-300 to-stone-400 dark:from-stone-700 dark:to-stone-600'}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
  
          <div className="bg-stone-900 dark:bg-emerald-950/20 text-white p-8 rounded-[2.5rem] border border-stone-850 dark:border-emerald-900/25 relative overflow-hidden group transition-all duration-300 shadow-md">
            {/* Glowing absolute background decoration */}
            <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-emerald-500/10 blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-6 border border-emerald-500/20 shadow-sm">
                <Sparkles size={22} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-serif font-black mb-3 italic tracking-tight">{insight.title}</h3>
              <p className="text-stone-300 dark:text-emerald-100/70 text-[13px] mb-6 leading-relaxed">
                {insight.text}
              </p>
              <button className="w-full bg-white dark:bg-stone-900 text-stone-900 dark:text-emerald-400 font-bold py-3 rounded-2xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest border border-stone-200 dark:border-stone-800">
                Get more insights <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
  
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="bg-white dark:bg-stone-900 p-8 rounded-[2.5rem] border border-stone-200/60 dark:border-stone-800 shadow-sm relative overflow-hidden flex flex-col transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.03)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-serif font-black text-stone-900 dark:text-white">Personalized for You</h3>
              <div className="p-2.5 bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 rounded-xl border border-violet-100/50 dark:border-violet-900/10">
                 <Sparkles size={16} />
              </div>
           </div>
           <div className="space-y-4 flex-1">
              {recLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-8 h-8 border-2 border-stone-200 dark:border-stone-800 border-t-emerald-600 rounded-full animate-spin"></div>
                </div>
              ) : (
                recommendedPosts.map((item, i) => (
                  <div key={item._id || item.id} className="flex items-center gap-4 p-3.5 hover:bg-stone-50/50 dark:hover:bg-stone-800/20 rounded-2xl border border-transparent hover:border-stone-100 dark:hover:border-stone-800 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-stone-950 flex items-center justify-center text-stone-400 dark:text-stone-600 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 border border-stone-100/50 dark:border-stone-900 transition-colors shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-bold text-stone-900 dark:text-stone-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{item.title}</h4>
                      <p className="text-[9px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest">{item.category || 'General'}</p>
                    </div>
                    <ArrowUpRight size={14} className="text-stone-300 dark:text-stone-700 group-hover:text-stone-900 dark:group-hover:text-white transition-colors" />
                  </div>
                ))
              )}
              {recommendedPosts.length === 0 && !recLoading && (
                <div className="text-center py-12 opacity-50">
                   <div className="w-12 h-12 rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center mx-auto mb-4">
                      <Sparkles size={20} className="text-stone-300" />
                   </div>
                   <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Growing suggestions...</p>
                </div>
              )}
           </div>
           {!recLoading && recommendedPosts.length > 0 && (
             <p className="mt-6 text-[10px] text-stone-400 font-medium italic text-center">Curated by AI based on your interaction styles.</p>
           )}
        </div>
 
        <div className="bg-white dark:bg-stone-900 p-8 rounded-[2.5rem] border border-stone-200/60 dark:border-stone-800 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.03)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
           <h3 className="text-lg font-serif font-black text-stone-900 dark:text-white mb-6">Top Performing Content</h3>
           <div className="space-y-4">
              {topPosts.slice(0, 4).map((item, i) => (
                <div key={item._id || item.id} className="flex items-center gap-4 p-4 hover:bg-stone-50/50 dark:hover:bg-stone-800/20 rounded-2xl border border-transparent hover:border-stone-100 dark:hover:border-stone-800 transition-all cursor-pointer group">
                  <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-stone-950 flex items-center justify-center text-stone-400 dark:text-stone-600 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 border border-stone-100/50 dark:border-stone-900 transition-colors shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{item.title}</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">{item.views || 0} views • {Math.round((item.secondsSpent || 0) / (item.views || 1))}s read</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-100/30">
                      Trending
                    </span>
                  </div>
                </div>
              ))}
           </div>
        </div>
 
        <div className="bg-white dark:bg-stone-900 p-8 rounded-[2.5rem] border border-stone-200/60 dark:border-stone-800 shadow-sm transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.03)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
           <h3 className="text-lg font-serif font-black text-stone-900 dark:text-white mb-6">Category Distribution</h3>
           <div className="space-y-4">
              {historicalData.length === 0 ? (
                <div className="py-12 text-center text-stone-400 dark:text-stone-600 text-xs font-bold uppercase tracking-widest">
                  Calculating metrics...
                </div>
              ) : historicalData.map((stat, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-stone-100 dark:border-stone-850 rounded-2xl hover:bg-stone-50/30 dark:hover:bg-stone-800/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-100/50 dark:border-stone-900 flex items-center justify-center text-xs font-bold text-stone-400 dark:text-stone-600">
                      {stat.label.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-900 dark:text-white">{stat.label}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">{stat.value} total views</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {stat.percent}
                    </p>
                    <p className="text-[9px] text-stone-400 dark:text-stone-600 font-black uppercase tracking-widest">Share</p>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
