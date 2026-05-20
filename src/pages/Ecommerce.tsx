/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { QuotaErrorBox } from '../components/QuotaErrorBox';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import { Navigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Plus, 
  Package, 
  TrendingUp, 
  IndianRupee, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  AlertTriangle,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  User,
  Mail,
  MapPin,
  CreditCard,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function ImageCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-300">
        <Package size={24} />
      </div>
    );
  }

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrent((prev) => (prev + 1) % images.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrent((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative w-full h-full group overflow-hidden bg-stone-50">
      <AnimatePresence mode="wait">
        <motion.img
          key={current}
          src={images[current]}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </AnimatePresence>
      
      {images.length > 1 && (
        <>
          <button 
            onClick={prev}
            className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          >
            <ChevronLeft size={14} />
          </button>
          <button 
            onClick={next}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          >
            <ChevronRight size={14} />
          </button>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <div 
                key={i} 
                className={`w-1 h-1 rounded-full transition-all ${i === current ? 'bg-emerald-500 w-2' : 'bg-stone-300'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Ecommerce() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState<any>(null);
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock: '',
    category: 'Home',
    images: [] as string[],
    newImageUrl: ''
  });

  const [currentImageIndex, setCurrentImageIndex] = useState<{ [key: string]: number }>({});

  const toggleImage = (productId: string, direction: 'prev' | 'next', max: number) => {
    setCurrentImageIndex(prev => {
      const current = prev[productId] || 0;
      let next = direction === 'next' ? current + 1 : current - 1;
      if (next >= max) next = 0;
      if (next < 0) next = max - 1;
      return { ...prev, [productId]: next };
    });
  };

  const fetchMedia = async () => {
    try {
      const data = await api.media.list();
      setMediaItems(data.filter(item => item.type === 'image'));
    } catch (error) {
      console.error('Failed to fetch media:', error);
    }
  };

  useEffect(() => {
    if (showMediaPicker) fetchMedia();
  }, [showMediaPicker]);

  const [isDeleting, setIsDeleting] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
    const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredOrders = orders.filter(o => {
    const matchesSearch = (o.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (o._id || o.id).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const fetchProducts = async () => {
    try {
      setError(null);
      const data = await api.products.list();
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError(err);
    }
  };

  const fetchOrders = async () => {
    try {
      setError(null);
      const data = await api.orders.list();
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    const interval = setInterval(() => {
      fetchProducts();
      fetchOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const [errorMessage, setErrorMessage] = useState<string>('');
  const addImageUrl = () => {
    if (!newProduct.newImageUrl.trim()) return;
    // Split by commas or whitespace to allow multiple URLs
    const rawUrls = newProduct.newImageUrl.split(/[,\s]+/).filter(Boolean);
    const added: string[] = [];
    for (const raw of rawUrls) {
      const url = raw.trim();
      const lower = url.toLowerCase();
      // Validate image extension
      if (!/(\.png|\.jpe?g|\.gif|\.webp|\.svg)$/i.test(lower)) {
        setErrorMessage(`Invalid image URL: ${url}`);
        continue; // skip invalid
      }
      if (!newProduct.images.includes(url) && !added.includes(url)) {
        added.push(url);
      } else {
        setErrorMessage(`Image URL already added: ${url}`);
      }
    }
    if (added.length > 0) {
      setNewProduct({
        ...newProduct,
        images: [...newProduct.images, ...added],
        newImageUrl: ''
      });
      setErrorMessage('');
    }
  };

  const removeImage = (index: number) => {
    setNewProduct({
      ...newProduct,
      images: newProduct.images.filter((_, i) => i !== index)
    });
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      setErrorMessage('Product Name, Price, and Stock are required.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      if (editingProduct) {
        await api.products.update(editingProduct._id || editingProduct.id, {
          name: newProduct.name,
          price: parseFloat(newProduct.price) || 0,
          stock: parseInt(newProduct.stock) || 0,
          category: newProduct.category,
          images: newProduct.images
        });
      } else {
        await api.products.create({
          name: newProduct.name,
          price: parseFloat(newProduct.price) || 0,
          stock: parseInt(newProduct.stock) || 0,
          status: 'active',
          category: newProduct.category,
          images: newProduct.images
        });
      }

      if (profile) {
        notificationService.createNotification({
          userId: profile.uid || profile._id,
          title: editingProduct ? 'Product Updated' : 'Product Cataloged',
          message: `"${newProduct.name}" has been ${editingProduct ? 'refined' : 'added'} in the marketplace.`,
          type: 'success'
        });
      }

      setShowAddModal(false);
      setEditingProduct(null);
      setNewProduct({
        name: '',
        price: '',
        stock: '',
        category: 'Home',
        images: [],
        newImageUrl: ''
      });
      fetchProducts();
    } catch (error) {
      console.error('Submit product failed:', error);
      setErrorMessage('Failed to save product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const initiateEdit = (product: any) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category,
      images: product.images || [],
      newImageUrl: ''
    });
    setShowAddModal(true);
  };

  const handleSimulateBuy = async (product: any) => {
    if (product.stock <= 0) return;
    try {
      const orderData = {
        customerName: profile?.displayName || 'Test Buyer',
        customerEmail: profile?.email || 'test@buyer.io',
        items: [
          {
            id: product._id || product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            images: product.images || []
          }
        ],
        total: product.price,
        status: 'pending',
        shippingAddress: '123 Sculptor Lane, Art District',
        createdAt: new Date().toISOString()
      };

      await api.orders.create(orderData);
      
      // Update stock
      await api.products.update(product._id || product.id, {
        stock: product.stock - 1
      });

      if (profile) {
        notificationService.createNotification({
          userId: profile.uid || profile._id,
          title: 'Simulation: Item Purchased',
          message: `A test order for "${product.name}" has been registered.`,
          type: 'success'
        });
      }

      fetchProducts();
      fetchOrders();
    } catch (error) {
      console.error('Simulation failed:', error);
    }
  };

  const initiateDelete = (product: any) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await api.products.delete(productToDelete._id || productToDelete.id);
      setShowDeleteModal(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (error) {
      console.error('Delete product failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusUpdate = async (productId: string, newStatus: string) => {
    try {
      await api.products.update(productId, { status: newStatus });
      fetchProducts();
    } catch (error) {
      console.error('Status update failed:', error);
    }
  };

  if (profile && !['admin', 'editor'].includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-8">
      {error && <QuotaErrorBox error={error.message || String(error)} />}
      {/* Commerce Stats Grid: Technical Aesthetic */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-px bg-stone-200 dark:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-[2rem] overflow-hidden shadow-sm transition-colors duration-300">
        {[
          { label: 'Total Revenue', value: `₹${orders.reduce((acc, o) => acc + o.total, 0).toLocaleString()}`, icon: IndianRupee, change: '+12.4%', color: 'text-emerald-600' },
          { label: 'Active Orders', value: orders.filter(o => o.status === 'pending').length, icon: ShoppingBag, change: 'Running', color: 'text-stone-900 dark:text-stone-100' },
          { label: 'Catalog Assets', value: products.length, icon: Package, change: 'Verified', color: 'text-stone-900 dark:text-stone-100' },
          { label: 'Avg. Order', value: `₹${orders.length > 0 ? Math.round(orders.reduce((acc, o) => acc + o.total, 0) / orders.length).toLocaleString() : 0}`, icon: TrendingUp, change: 'Stable', color: 'text-emerald-600' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white dark:bg-stone-900 p-6 md:p-8 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all group"
          >
            <div className="flex items-center justify-between mb-6">
              <p className="text-stone-400 dark:text-stone-500 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
              <div className={`flex items-center gap-1 text-[9px] font-black ${stat.color} bg-stone-50 dark:bg-stone-800 px-2 py-0.5 rounded-full border border-stone-100 dark:border-stone-700`}>
                {stat.change}
              </div>
            </div>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-display font-medium text-stone-900 dark:text-white tracking-tighter tabular-nums">{stat.value}</h3>
              <stat.icon size={22} className="text-stone-200 dark:text-stone-700 group-hover:text-emerald-500 transition-colors duration-500" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Commerce Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <div className="flex bg-stone-200/50 dark:bg-stone-800/50 p-1 rounded-2xl w-fit border border-stone-100 dark:border-stone-800 transition-colors">
              <button 
                onClick={() => setTab('products')}
                className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${tab === 'products' ? 'bg-white dark:bg-stone-900 shadow-sm text-stone-900 dark:text-white border border-stone-200 dark:border-stone-800' : 'text-stone-400 dark:text-stone-500'}`}
              >
                Products
              </button>
              <button 
                onClick={() => setTab('orders')}
                className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${tab === 'orders' ? 'bg-white dark:bg-stone-900 shadow-sm text-stone-900 dark:text-white border border-stone-200 dark:border-stone-800' : 'text-stone-400 dark:text-stone-500'}`}
              >
                Orders
              </button>
           </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative group">
            <input 
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-stone-900 dark:text-white w-full sm:w-[220px]"
            />
            <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-emerald-500 transition-colors" />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto relative">
            <button 
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all flex items-center gap-2 ${showFilterMenu || filterCategory !== 'All' || filterStatus !== 'All' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' : 'bg-white dark:bg-stone-900 text-stone-500 border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'}`}
            >
              <Filter size={16} />
              <span>Filters {(filterCategory !== 'All' || filterStatus !== 'All') && '•'}</span>
            </button>

            <AnimatePresence>
              {showFilterMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowFilterMenu(false)} 
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-4 z-50 space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Category</label>
                      <div className="flex flex-wrap gap-1.5">
                        {['All', 'Home', 'Personal Care', 'Kitchen', 'Accessories'].map(cat => (
                          <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${filterCategory === cat ? 'bg-emerald-600 text-white' : 'bg-stone-50 dark:bg-stone-800 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700'}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Status</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {['All', 'active', 'archived', ...(tab === 'orders' ? ['pending', 'completed'] : [])].map(status => (
                          <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${filterStatus === status ? 'bg-blue-600 text-white' : 'bg-stone-50 dark:bg-stone-800 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700'}`}
                          >
                            {status === 'archived' ? 'Not Active' : status}
                          </button>
                        ))}
                      </div>
                    </div>
                    {(filterCategory !== 'All' || filterStatus !== 'All') && (
                      <button 
                        onClick={() => {
                          setFilterCategory('All');
                          setFilterStatus('All');
                        }}
                        className="w-full py-2 text-[10px] font-black text-stone-400 hover:text-stone-900 uppercase tracking-widest text-center"
                      >
                        Reset All
                      </button>
                    )}
                    {profile?.role === 'admin' && (
                      <div className="pt-4 border-t border-stone-100 dark:border-stone-800">
                        <button 
                          onClick={async () => {
                            if (window.confirm(`Are you absolutely sure you want to PURGE ALL ${tab.toUpperCase()}? This action is irreversible and will wipe the entire collection.`)) {
                              try {
                                if (tab === 'products') {
                                  await api.products.clearAll();
                                  fetchProducts();
                                } else {
                                  await api.orders.clearAll();
                                  fetchOrders();
                                }
                                notificationService.createNotification({
                                  userId: profile?.uid || profile?._id,
                                  title: 'Sanitization Complete',
                                  message: `All ${tab} have been successfully purged from the laboratory records.`,
                                  type: 'success'
                                });
                                setShowFilterMenu(false);
                              } catch (err) {
                                console.error('Purge failed:', err);
                              }
                            }
                          }}
                          className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-black text-rose-400 hover:text-rose-600 uppercase tracking-widest text-center border-t border-dashed border-stone-100 dark:border-stone-800 pt-4"
                        >
                          <Trash2 size={12} />
                          Purge All {tab}
                        </button>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            
            <button 
              onClick={() => {
                setEditingProduct(null);
                setNewProduct({
                  name: '',
                  price: '',
                  stock: '',
                  category: 'Home',
                  images: [],
                  newImageUrl: ''
                });
                setShowAddModal(true);
              }}
              className="flex-1 sm:flex-none justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all text-sm shadow-md shadow-emerald-500/10"
            >
              <Plus size={18} /> <span className="whitespace-nowrap">Add Product</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {tab === 'products' ? (
            <div className="grid grid-cols-1 gap-6">
              <div className="hidden lg:block bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50 dark:bg-stone-950 border-b border-stone-100 dark:border-stone-800">
                      <tr>
                        <th className="px-8 py-4 text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Product</th>
                        <th className="px-8 py-4 text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Category</th>
                        <th className="px-8 py-4 text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Price</th>
                        <th className="px-8 py-4 text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Stock</th>
                        <th className="px-8 py-4 text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Status</th>
                        <th className="px-8 py-4 text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center gap-2 text-stone-400 dark:text-stone-600">
                               <Package size={40} strokeWidth={1} />
                               <p className="font-medium">No results matching criteria</p>
                            </div>
                          </td>
                        </tr>
                      ) : filteredProducts.map((p) => (
                        <tr key={p._id || p.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/50 group transition-colors">
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 overflow-hidden shrink-0">
                                <ImageCarousel images={p.images} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-stone-900 dark:text-white tracking-tight">{p.name}</p>
                                <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest">ID: {(p._id || p.id).substring(0, 8)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg border shadow-sm ${
                                p.category === 'Home' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                p.category === 'Personal Care' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                p.category === 'Kitchen' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                'bg-purple-50 text-purple-600 border-purple-100'
                              }`}>
                                <Package size={14} />
                              </div>
                              <span className="text-sm text-stone-600 dark:text-stone-400 font-medium">{p.category}</span>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-sm font-bold text-stone-900 dark:text-white tracking-tight">₹{p.price.toLocaleString() ?? '0'}</td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 max-w-[60px] h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (p.stock / 100) * 100)}%` }}></div>
                              </div>
                              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">{p.stock} units</span>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <select 
                              value={p.status}
                              onChange={(e) => handleStatusUpdate(p._id || p.id, e.target.value)}
                              className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-xl border appearance-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all
                                ${p.status === 'active' ? 'bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-200 dark:hover:border-emerald-800' : 'bg-rose-50/50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30 hover:border-rose-200 dark:hover:border-rose-800'}`}
                            >
                              <option value="active" className="bg-white dark:bg-stone-900 text-emerald-600">Active</option>
                              <option value="archived" className="bg-white dark:bg-stone-900 text-rose-600">Not Active</option>
                            </select>
                          </td>
                          <td className="px-8 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleSimulateBuy(p)}
                                disabled={p.stock <= 0}
                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${
                                  p.stock > 0 
                                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border-emerald-100 hover:shadow-lg hover:shadow-emerald-500/20' 
                                  : 'text-stone-400 bg-stone-50 dark:bg-stone-800 border-stone-100 dark:border-stone-700 cursor-not-allowed italic'
                                }`}
                              >
                                <ShoppingBag size={14} />
                                {p.stock > 0 ? 'Buy' : 'Not Available'}
                              </button>
                              <div className="w-px h-6 bg-stone-100 dark:bg-stone-800 mx-1" />
                              <button 
                                onClick={() => initiateEdit(p)}
                                className="text-blue-500 hover:text-blue-600 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all border border-transparent hover:border-blue-100"
                                title="Edit Product"
                              >
                                <MoreHorizontal size={18} />
                              </button>
                              <button 
                                onClick={() => initiateDelete(p)}
                                className="text-rose-400 hover:text-rose-600 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all border border-transparent hover:border-rose-100"
                                title="Delete Product"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((p) => (
                  <div key={p._id || p.id} className="bg-white dark:bg-stone-900 p-5 rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-sm flex gap-4 transition-colors">
                    <div className="w-24 h-24 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 overflow-hidden shrink-0">
                      <ImageCarousel images={p.images} />
                    </div>
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-stone-900 dark:text-white truncate">{p.name}</h4>
                          <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest">{p.category}</p>
                        </div>
                        <button 
                          onClick={() => initiateDelete(p)}
                          className="text-stone-300 dark:text-stone-700 hover:text-rose-500 p-1.5 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="flex items-end justify-between mt-auto">
                        <div>
                          <p className="text-lg font-bold text-stone-900 dark:text-white leading-none">₹{p.price}</p>
                          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{p.stock} in stock</p>
                        </div>
                        <select 
                          value={p.status}
                          onChange={(e) => handleStatusUpdate(p._id || p.id, e.target.value)}
                          className={`text-[9px] uppercase font-bold tracking-widest px-2.5 py-1.5 rounded-lg border appearance-none transition-colors
                            ${p.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'}`}
                        >
                          <option value="active">Active</option>
                          <option value="archived">Not Active</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {filteredOrders.length === 0 ? (
                    <div className="bg-white dark:bg-stone-900 p-20 rounded-3xl border border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center text-stone-400 dark:text-stone-600 gap-3 transition-colors">
                       <ShoppingBag size={48} strokeWidth={1} />
                       <p className="font-medium">No orders found</p>
                    </div>
                  ) : filteredOrders.map((o) => (
                    <div 
                      key={o._id || o.id} 
                      onClick={() => setSelectedOrder(o)}
                      className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between group cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-600 hover:shadow-xl hover:shadow-emerald-900/5 transition-all"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          <ShoppingBag size={24} />
                        </div>
                        <div>
                          <h4 className="font-serif font-bold text-stone-900 dark:text-white text-lg tracking-tight">Order #{(o._id || o.id).substring(0, 6)}</h4>
                          <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest">{o.customerName || 'Guest'} • {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'Recent'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                         <div className="text-right">
                            <p className="text-lg font-serif font-bold text-stone-900 dark:text-white tracking-tight">₹{o.total.toLocaleString()}</p>
                            <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest">{o.status}</p>
                         </div>
                         <ChevronRight size={20} className="text-stone-300 dark:text-stone-700 group-hover:text-emerald-500 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-6">
                   <div className="bg-white dark:bg-stone-900 p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm transition-colors">
                      <h3 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em] mb-8">Fulfillment State</h3>
                       <div className="space-y-8">
                          <div className="flex items-center gap-5">
                             <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <Clock size={22} />
                             </div>
                             <div>
                                <p className="text-2xl font-serif font-bold text-stone-900 dark:text-white tracking-tight">{orders.filter(o => o.status === 'pending').length}</p>
                                <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest">Awaiting Sculpture</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-5">
                             <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={22} />
                             </div>
                             <div>
                                <p className="text-2xl font-serif font-bold text-stone-900 dark:text-white tracking-tight">{orders.filter(o => o.status === 'completed').length}</p>
                                <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest">Vanishment Success</p>
                             </div>
                          </div>
                       </div>
                   </div>

                   <div className="bg-stone-900 dark:bg-stone-950 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-stone-900/20 relative overflow-hidden border border-emerald-900/20">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[80px] rounded-full -mr-16 -mt-16" />
                      <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.3em] flex items-center gap-2 mb-8">
                        <TrendingUp size={14} />
                        Growth Milestone
                      </h3>
                      <div className="relative pt-1">
                        <div className="flex mb-4 items-center justify-between">
                          <div>
                            <span className="text-[9px] font-black inline-block py-1 px-3 uppercase rounded-lg text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 tracking-widest">
                               {orders.length > 0 ? 'Active Pulse' : 'Initialization'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-serif font-bold text-white tracking-tight">
                              {Math.min(100, Math.round((orders.reduce((acc, o) => acc + o.total, 0) / 15000) * 100))}%
                            </span>
                          </div>
                        </div>
                        <div className="overflow-hidden h-1.5 mb-6 flex rounded-full bg-stone-800 dark:bg-stone-900">
                          <div 
                            style={{ width: `${Math.min(100, (orders.reduce((acc, o) => acc + o.total, 0) / 15000) * 100)}%` }} 
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          />
                        </div>
                      </div>
                      <p className="text-stone-400 text-[11px] leading-relaxed font-medium italic opacity-80">
                        Currently at <span className="text-white font-bold">₹{orders.reduce((acc, o) => acc + o.total, 0).toLocaleString()}</span> towards your ₹15,000 signature goal.
                      </p>
                   </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-stone-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-stone-100 dark:border-stone-800 transition-colors"
            >
              <div className="p-6 md:p-8 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    {editingProduct ? <MoreHorizontal size={20} /> : <Plus size={20} />}
                  </div>
                  <h3 className="text-xl md:text-2xl font-serif font-bold text-stone-900 dark:text-white">{editingProduct ? 'Refine Product' : 'Add New Product'}</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-stone-400 dark:text-stone-600 hover:text-stone-900 dark:hover:text-white p-2 transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handleAddProduct} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                {errorMessage && (
                  <p className="text-sm text-rose-600 mb-2">{errorMessage}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest px-1">Product Name</label>
                    <input 
                      required
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl px-4 py-3 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-stone-300 dark:placeholder:text-stone-700"
                      placeholder="Ex: Luxury Sandalwood Soap"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest px-1">Category</label>
                    <select 
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                      className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl px-4 py-3 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      <option className="bg-white dark:bg-stone-900">Home</option>
                      <option className="bg-white dark:bg-stone-900">Personal Care</option>
                      <option className="bg-white dark:bg-stone-900">Kitchen</option>
                      <option className="bg-white dark:bg-stone-900">Accessories</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest px-1">Price (₹)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                      className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl px-4 py-3 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-stone-300 dark:placeholder:text-stone-700"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest px-1">Inventory Level</label>
                    <input 
                      required
                      type="number"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                      className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl px-4 py-3 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-stone-300 dark:placeholder:text-stone-700"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">Product Images</label>
                    <button 
                      type="button"
                      onClick={() => setShowMediaPicker(!showMediaPicker)}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors uppercase tracking-widest flex items-center gap-1.5"
                    >
                      <ImageIcon size={12} /> {showMediaPicker ? 'Close Library' : 'Pick from Media Pool'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showMediaPicker && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 rounded-[1.5rem] p-4 mb-4 overflow-hidden"
                      >
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                          {mediaItems.map((item) => (
                            <button
                              key={item._id || item.id}
                              type="button"
                              onClick={() => {
                                if (!newProduct.images.includes(item.url)) {
                                  setNewProduct(prev => ({ ...prev, images: [...prev.images, item.url] }));
                                }
                              }}
                              className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative group/item ${newProduct.images.includes(item.url) ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-transparent hover:border-emerald-500/50'}`}
                            >
                              <img src={item.url} className="w-full h-full object-cover" alt="" />
                              {newProduct.images.includes(item.url) && (
                                <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                  <div className="bg-emerald-500 text-white rounded-full p-0.5">
                                    <Plus size={12} className="rotate-45" />
                                  </div>
                                </div>
                              )}
                            </button>
                          ))}
                          {mediaItems.length === 0 && (
                            <div className="col-span-full py-6 text-center">
                              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest italic">No image artifacts found in library.</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        value={newProduct.newImageUrl}
                        onChange={(e) => setNewProduct({...newProduct, newImageUrl: e.target.value})}
                        className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-stone-300 dark:placeholder:text-stone-700"
                        placeholder="Paste image URL here..."
                      />
                      <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-600" />
                    </div>
                    <button 
                      type="button"
                      onClick={addImageUrl}
                      className="bg-stone-900 dark:bg-stone-800 text-white px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-stone-800 dark:hover:bg-emerald-600 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  
                  {newProduct.images.length === 0 && (
                    <div className="flex items-center justify-center p-8 text-stone-400 dark:text-stone-600">
                      <p className="text-xs font-bold uppercase tracking-widest italic">No images added. Add images to showcase the product.</p>
                    </div>
                  )}

                  {newProduct.images.length > 0 && (
                    <div className="flex flex-wrap gap-3 p-4 bg-stone-50 dark:bg-stone-950 rounded-3xl border border-stone-100 dark:border-stone-800 min-h-[100px] transition-colors">
                      {newProduct.images.map((img, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 group">
                          <img src={img} className="w-full h-full object-cover" alt="Product" />
                          <button 
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute inset-0 bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 active:scale-95"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                       <Loader2 size={16} className="animate-spin" />
                       {editingProduct ? 'Refining...' : 'Cataloging...'}
                    </div>
                  ) : editingProduct ? 'Commit Refinement' : 'Commit to Catalog'}
                </button>
              </form>
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
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-stone-900">Purge Catalog Item</h3>
                  <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">Destructive Action</p>
                </div>
              </div>

              <p className="text-sm text-stone-600 leading-relaxed mb-8">
                Are you sure you want to remove <span className="font-bold text-stone-900">{productToDelete?.name}</span>? 
                This will permanently delete this product from your shop's inventory.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirm Purge'}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 bg-stone-100 text-stone-500 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-stone-200 transition-all font-display"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Details Drawer */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl h-full bg-white dark:bg-stone-900 shadow-2xl flex flex-col border-l border-stone-100 dark:border-stone-800 transition-colors"
            >
              <div className="p-8 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <ShoppingBag size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-white">Order #{(selectedOrder._id || selectedOrder.id).substring(0, 8)}</h3>
                      <p className="text-xs text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest">{selectedOrder.status}</p>
                   </div>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-xl text-stone-400 dark:text-stone-600 hover:text-stone-900 dark:hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <section className="space-y-4">
                  <h4 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest px-1">Customer Profile</h4>
                  <div className="bg-stone-50 dark:bg-stone-950 rounded-[2rem] p-6 border border-stone-100 dark:border-stone-800 grid grid-cols-1 md:grid-cols-2 gap-6 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-white dark:bg-stone-900 rounded-xl text-stone-400 dark:text-stone-600 border border-stone-100 dark:border-stone-800 transition-colors">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Full Name</p>
                        <p className="text-sm font-bold text-stone-900 dark:text-white transition-colors">{selectedOrder.customerName || 'Anonymous Sculptor'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-white dark:bg-stone-900 rounded-xl text-stone-400 dark:text-stone-600 border border-stone-100 dark:border-stone-800 transition-colors">
                        <Mail size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Email Address</p>
                        <p className="text-sm font-bold text-stone-900 dark:text-white transition-colors">{selectedOrder.customerEmail || 'no-email@sculpt.io'}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest px-1">Logistics & Shipping</h4>
                  <div className="bg-stone-50 dark:bg-stone-950 rounded-[2rem] p-6 border border-stone-100 dark:border-stone-800 flex items-start gap-4 transition-colors">
                    <div className="p-2 bg-white dark:bg-stone-900 rounded-xl text-stone-400 dark:text-stone-600 border border-stone-100 dark:border-stone-800 shrink-0 transition-colors">
                      <MapPin size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Delivery Address</p>
                      <p className="text-sm font-medium text-stone-700 dark:text-stone-400 leading-relaxed italic transition-colors">
                        {selectedOrder.shippingAddress || 'Digital Delivery'}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest px-1 flex justify-between items-center">
                    <span>Purchased Elements</span>
                    <span className="text-stone-900 dark:text-white border-b-2 border-stone-900 dark:border-white transition-colors">{(selectedOrder.items || []).length} items</span>
                  </h4>
                  <div className="space-y-2">
                    {(selectedOrder.items || []).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-stone-950 border border-stone-100 dark:border-stone-800 rounded-2xl transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-stone-50 dark:bg-stone-900 flex items-center justify-center text-stone-300 dark:text-stone-700 border border-stone-100 dark:border-stone-800 transition-colors relative overflow-hidden group/item">
                            {item.images && item.images.length > 0 ? (
                              <img src={item.images[0]} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <Package size={20} />
                            )}
                            {item.images && item.images.length > 1 && (
                              <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                                 <span className="text-[8px] font-black text-white uppercase tracking-tighter">+{item.images.length - 1} More</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-stone-900 dark:text-white transition-colors">{item.name || 'Site Component'}</p>
                            <p className="text-xs text-stone-500 dark:text-stone-500 transition-colors">Qty: {item.quantity || 1} • Unit: ₹{item.price || '0.00'}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-stone-900 dark:text-white transition-colors">₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="pt-6 border-t border-stone-100 dark:border-stone-800 transition-colors">
                  <div className="bg-stone-900 dark:bg-stone-950 p-6 rounded-[2rem] text-white border border-white/5 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 opacity-60">
                        <CreditCard size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Financial Summary</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end border-t border-white/10 pt-4">
                      <span className="text-xs font-bold uppercase tracking-widest">Final Total</span>
                      <span className="text-3xl font-serif font-bold text-emerald-400">₹{selectedOrder.total}</span>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
