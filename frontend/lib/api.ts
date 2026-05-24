/**
 * API client connecting to local MongoDB backend.
 */

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || ((import.meta as any).env.DEV ? 'http://localhost:3000/api' : '/api');

async function request(endpoint: string, options: RequestInit = {}) {
  const uid = localStorage.getItem('artisan_user_id') || 'local-user-id';
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': uid,
      ...options.headers,
    },
  });
  if (!response.ok) {
    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch (e) {
      bodyText = '';
    }
    throw new Error(JSON.stringify({ status: response.status, statusText: response.statusText, url: response.url, body: bodyText }));
  }
  return response.json();
}

const mockUser = {
  uid: 'local-user-id',
  email: 'local@artisan.workshop',
  displayName: 'Local Artisan',
  role: 'admin',
  avatarUrl: ''
};

export const auth = {
  currentUser: mockUser
};

export const db = {};

export function normalizeData(data: any): any {
  return data;
}

export const api = {
  // Auth
  auth: {
    me: async () => {
      const uid = localStorage.getItem('artisan_user_id') || 'local-user-id';
      return request('/auth/me', { headers: { 'x-user-id': uid } });
    },
    login: async (data: any) => {
      const user = await request('/auth/login', { method: 'POST', body: JSON.stringify(data) });
      localStorage.setItem('artisan_user_id', user.uid);
      return user;
    },
    loginWithGoogle: async (authCode: string, role?: string) => {
      const user = await request('/auth/google', { 
        method: 'POST',
        body: JSON.stringify({ code: authCode, role })
      });
      localStorage.setItem('artisan_user_id', user.uid);
      return user;
    }
  },

  ai: {
    generateContent: async (prompt: string, systemInstruction?: string) =>
      request('/ai/content', {
        method: 'POST',
        body: JSON.stringify({ prompt, systemInstruction })
      })
  },
  
  // Posts/Articles
  posts: {
    list: async (params?: any) => request(`/posts?${new URLSearchParams(params)}`),
    get: async (slug: string) => request(`/posts/${slug}`),
    create: async (data: any) => request('/posts', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) => request(`/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: async (id: string) => request(`/posts/${id}`, { method: 'DELETE' }),
    trackView: async (id: string) => request(`/posts/${id}/view`, { method: 'POST' }),
    trackTime: async (id: string, seconds: number) => request(`/posts/${id}/time`, { method: 'POST', body: JSON.stringify({ seconds }) }),
    addComment: async (id: string, data: any) => request(`/posts/${id}/comments`, { method: 'POST', body: JSON.stringify(data) }),
    addReply: async (id: string, commentId: string, data: any) => request(`/posts/${id}/comments/${commentId}/reply`, { method: 'POST', body: JSON.stringify(data) })
  },
  
  // Media
  media: {
    list: async () => request('/media'),
    update: async (id: string, data: any) => request(`/media/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    upload: async (file: File) => {
      const uid = localStorage.getItem('artisan_user_id') || mockUser.uid;
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      const fileNameLower = file.name.toLowerCase();
      const isAudioExt = fileNameLower.endsWith('.mp3') || fileNameLower.endsWith('.wav') || fileNameLower.endsWith('.m4a') || fileNameLower.endsWith('.ogg') || fileNameLower.endsWith('.aac');
      const isVideoExt = fileNameLower.endsWith('.mp4') || fileNameLower.endsWith('.webm') || fileNameLower.endsWith('.mov');
      
      let detectedType = 'other';
      if (file.type.startsWith('image/')) detectedType = 'image';
      else if (isAudioExt || file.type.startsWith('audio/')) detectedType = 'audio';
      else if (isVideoExt || file.type.startsWith('video/')) detectedType = 'video';
      else if (file.type.includes('pdf') || file.type.includes('epub') || fileNameLower.endsWith('.pdf')) detectedType = 'ebook';

      return request('/media', {
        method: 'POST',
        body: JSON.stringify({
          name: file.name,
          type: detectedType,
          url: dataUrl,
          size: (file.size / 1024).toFixed(1) + ' KB',
          sizeBytes: file.size,
          ownerId: uid
        })
      });
    },
    saveReference: async (data: any) => request('/media', { method: 'POST', body: JSON.stringify(data) }),
    rehost: async (data: { url: string; name?: string }) => request('/proxy-image', { method: 'POST', body: JSON.stringify(data) }),
    analyze: async (data: { url?: string; base64?: string; mimeType?: string; prompt: string }) => request('/vision-tags', { method: 'POST', body: JSON.stringify(data) }),
    generateImage: async (prompt: string) => request('/media/generate-image', { method: 'POST', body: JSON.stringify({ prompt }) }),
    generateAudio: async (prompt: string) => request('/audio/generate', { method: 'POST', body: JSON.stringify({ prompt }) }),
    searchStock: async (query: string, type: string) => request(`/media/stock-search?type=${encodeURIComponent(type)}&query=${encodeURIComponent(query)}`),

    delete: async (id: string) => request(`/media/${id}`, { method: 'DELETE' }),
    generateVideo: async (data: { prompt: string, style?: string }) => request('/videos/generate', { method: 'POST', body: JSON.stringify(data) }),
  },
  
  // Settings
  settings: {
    get: async () => request('/settings'),
    update: async (data: any) => request('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  },
  
  // Notifications
  notifications: {
    list: async () => request('/notifications'),
    create: async (data: any) => request('/notifications', { method: 'POST', body: JSON.stringify(data) }),
    readAll: async () => request('/notifications/read-all', { method: 'POST' }),
    markAsRead: async (id: string) => request(`/notifications/${id}/read`, { method: 'POST' }),
    delete: async (id: string) => request(`/notifications/${id}`, { method: 'DELETE' }),
    clearAll: async () => request('/notifications', { method: 'DELETE' }),
  },

  // Users
  users: {
    list: async () => request('/users'),
    update: async (id: string, data: any) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: async (id: string) => request(`/users/${id}`, { method: 'DELETE' }),
    invite: async (data: any) => request('/invitations', { method: 'POST', body: JSON.stringify(data) }),
  },

  sites: {
    list: async (limitCount?: number) => request(`/sites${limitCount ? `?limit=${limitCount}` : ''}`),
    create: async (data: any) => request('/sites', { method: 'POST', body: JSON.stringify(data) }),
    delete: async (id: string) => request(`/sites/${id}`, { method: 'DELETE' }),
  },

  themes: {
    list: async () => request('/themes'),
    create: async (data: any) => request('/themes', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) => request(`/themes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: async (id: string) => request(`/themes/${id}`, { method: 'DELETE' }),
  },

  products: {
    list: async () => request('/products'),
    create: async (data: any) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) => request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: async (id: string) => request(`/products/${id}`, { method: 'DELETE' }),
    clearAll: async () => request('/products', { method: 'DELETE' }),
  },

  orders: {
    list: async () => request('/orders'),
    create: async (data: any) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
    clearAll: async () => request('/orders', { method: 'DELETE' }),
  },

  feedback: {
    send: async (data: any) => request('/feedback', { method: 'POST', body: JSON.stringify(data) }),
    list: async () => request('/feedback'),
  },
  
  adminLogs: {
    list: async () => request('/admin-logs'),
    record: async (action: string, detail?: string) => request('/admin-logs', { method: 'POST', body: JSON.stringify({ action, detail }) }),
  },

  system: {
    seed: async () => request('/system/seed', { method: 'POST' }),
  },
  
  invitations: {
    send: async (data: { email: string; role?: string; siteName?: string }) => 
      request('/invitations', { method: 'POST', body: JSON.stringify(data) }),
  }
};
