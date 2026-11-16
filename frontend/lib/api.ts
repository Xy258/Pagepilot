import { upload as uploadBlob } from '@vercel/blob/client';

// API client connecting to the backend.
// It automatically prefixes every endpoint with the base URL.
// The base URL is taken from the VITE_API_BASE_URL env variable (set in .env files).
// If not defined, it falls back to the current origin (window.location.origin),
// which works for local development where the frontend serves the API from the same host.

const API_BASE_URL = (((import.meta as any).env?.VITE_API_BASE_URL as string)?.trim() || "/api").replace(/\/+$/g, "");

/**
 * Generic request helper used by all API namespaces.
 * @param endpoint Relative endpoint (e.g. "/auth/login")
 * @param options Fetch init options
 */
export async function request(endpoint: string, options: RequestInit = {}): Promise<any> {
  const normalizedEndpoint = endpoint.replace(/^\/+/, "");
  const url = `${API_BASE_URL}/${normalizedEndpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, { ...options, headers, credentials: 'include' });

  if (!response.ok) {
    let body = "";
    try { body = await response.text(); } catch (_) {}
    throw new Error(JSON.stringify({ status: response.status, statusText: response.statusText, url, body }));
  }
  return response.json();
}

export const auth = { currentUser: null };
export const db = {};
export function normalizeData(data: any): any { return data; }

export const api = {
  // Auth
  auth: {
    me: async () => request('/auth/me'),
    login: async (data: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: async (data: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    logout: async () => request('/auth/logout', { method: 'POST' }),
    loginWithGoogle: async (authCode: string) => request('/auth/google', { method: 'POST', body: JSON.stringify({ code: authCode }) })
  },
  // AI helpers (unchanged)
  ai: {
    generateContent: async (prompt: string, systemInstruction?: string) =>
      request('/ai/content', { method: 'POST', body: JSON.stringify({ prompt, systemInstruction }) })
  },
  // Posts / Articles
  posts: {
    list: async (params?: any) => {
      const query = params ? `?${new URLSearchParams(params).toString()}` : '';
      return request(`/posts${query}`);
    },
    get: async (slug: string) => request(`/posts/${slug}`),
    create: async (data: any) => request('/posts', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) => request(`/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: async (id: string) => request(`/posts/${id}`, { method: 'DELETE' }),
    trackView: async (id: string) => request(`/posts/${id}/view`, { method: 'POST' }),
    trackTime: async (id: string, seconds: number) => request(`/posts/${id}/time`, { method: 'POST', body: JSON.stringify({ seconds }) }),
    addComment: async (id: string, data: any) => request(`/posts/${id}/comments`, { method: 'POST', body: JSON.stringify(data) }),
    addReply: async (id: string, commentId: string, data: any) => request(`/posts/${id}/comments/${commentId}/reply`, { method: 'POST', body: JSON.stringify(data) })
  },
  // Media helpers (unchanged)
  media: {
    list: async () => request('/media'),
    update: async (id: string, data: any) => request(`/media/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    upload: async (file: File) => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const extensionTypes: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
        mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg', aac: 'audio/aac',
        mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', pdf: 'application/pdf', epub: 'application/epub+zip'
      };
      const mediaTypes: Record<string, string> = {
        'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image', 'image/gif': 'image',
        'audio/mpeg': 'audio', 'audio/mp4': 'audio', 'audio/wav': 'audio', 'audio/x-wav': 'audio', 'audio/ogg': 'audio', 'audio/aac': 'audio',
        'video/mp4': 'video', 'video/webm': 'video', 'video/quicktime': 'video',
        'application/pdf': 'ebook', 'application/epub+zip': 'ebook'
      };
      const contentType = mediaTypes[file.type] ? file.type : extensionTypes[extension];
      if (!contentType || !mediaTypes[contentType]) throw new Error('Unsupported media type.');
      if (!file.size || file.size > 8 * 1024 * 1024) throw new Error('Media uploads must be 8 MB or smaller.');

      const currentUser = await request('/auth/me');
      const mediaId = Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const name = file.name.replaceAll('/', '_').replaceAll(String.fromCharCode(92), '_').replace(/[\x00-\x1f\x7f]/g, '_').slice(0, 180) || 'upload';
      const pathname = `users/${encodeURIComponent(currentUser.uid)}/${mediaId}/${name}`;
      const blob = await uploadBlob(pathname, file, {
        access: 'private',
        contentType,
        handleUploadUrl: `${API_BASE_URL}/media/upload-token`,
        clientPayload: JSON.stringify({ mediaId, name, contentType, sizeBytes: file.size })
      });
      return request('/media/complete', {
        method: 'POST',
        body: JSON.stringify({ mediaId, pathname: blob.pathname, name })
      });
    },
    saveReference: async (data: any) => request('/media', { method: 'POST', body: JSON.stringify(data) }),
    rehost: async (data: { url: string; name?: string }) => request('/proxy-image', { method: 'POST', body: JSON.stringify(data) }),
    analyze: async (data: { url?: string; base64?: string; mimeType?: string; prompt: string }) => request('/vision-tags', { method: 'POST', body: JSON.stringify(data) }),
    generateImage: async (prompt: string) => request('/media/generate-image', { method: 'POST', body: JSON.stringify({ prompt }) }),
    generateAudio: async (prompt: string) => request('/audio/generate', { method: 'POST', body: JSON.stringify({ prompt }) }),
    searchStock: async (query: string, type: string) => request(`/media/stock-search?type=${encodeURIComponent(type)}&query=${encodeURIComponent(query)}`),
    delete: async (id: string) => request(`/media/${id}`, { method: 'DELETE' }),
    generateVideo: async (data: { prompt: string; style?: string }) => request('/videos/generate', { method: 'POST', body: JSON.stringify(data) })
  },
  // Settings
  settings: {
    get: async () => request('/settings'),
    update: async (data: any) => request('/settings', { method: 'PATCH', body: JSON.stringify(data) })
  },
  // Notifications
  notifications: {
    list: async () => request('/notifications'),
    create: async (data: any) => request('/notifications', { method: 'POST', body: JSON.stringify(data) }),
    readAll: async () => request('/notifications/read-all', { method: 'POST' }),
    markAsRead: async (id: string) => request(`/notifications/${id}/read`, { method: 'POST' }),
    delete: async (id: string) => request(`/notifications/${id}`, { method: 'DELETE' }),
    clearAll: async () => request('/notifications', { method: 'DELETE' })
  },
  // Users
  users: {
    list: async () => request('/users'),
    update: async (id: string, data: any) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: async (id: string) => request(`/users/${id}`, { method: 'DELETE' }),
    invite: async (data: any) => request('/invitations', { method: 'POST', body: JSON.stringify(data) })
  },
  // Sites
  sites: {
    list: async (limitCount?: number) => request(`/sites${limitCount ? `?limit=${limitCount}` : ''}`),
    create: async (data: any) => request('/sites', { method: 'POST', body: JSON.stringify(data) }),
    delete: async (id: string) => request(`/sites/${id}`, { method: 'DELETE' })
  },
  // Themes
  themes: {
    list: async () => request('/themes'),
    create: async (data: any) => request('/themes', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) => request(`/themes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: async (id: string) => request(`/themes/${id}`, { method: 'DELETE' })
  },
  // Products
  products: {
    list: async () => request('/products'),
    create: async (data: any) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) => request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: async (id: string) => request(`/products/${id}`, { method: 'DELETE' }),
    clearAll: async () => request('/products', { method: 'DELETE' })
  },
  // Orders
  orders: {
    list: async () => request('/orders'),
    create: async (data: any) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
    clearAll: async () => request('/orders', { method: 'DELETE' })
  },
  // Feedback
  feedback: {
    send: async (data: any) => request('/feedback', { method: 'POST', body: JSON.stringify(data) }),
    list: async () => request('/feedback')
  },
  adminLogs: {
    list: async () => request('/admin-logs'),
    record: async (action: string, detail: string) => request('/admin-logs', { method: 'POST', body: JSON.stringify({ action, detail }) })
  },
  system: {
    seed: async () => request('/system/seed', { method: 'POST' })
  }
};
