import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import bcrypt from 'bcryptjs';
dotenv.config();
if (fs.existsSync('./.env.local')) {
  dotenv.config({ path: './.env.local', override: true });
}
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes, createHash } from 'crypto';
import { lookup } from 'dns/promises';
import { BlockList, isIP } from 'net';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { Groq } from 'groq-sdk';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), './.env.local') });
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), './.env.development.local') });
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env.development.local') });

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 5000;

const serverGeminiApiKeys = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
  process.env.GEMINI_API_KEY_6,
  process.env.GEMINI_API_KEY
].filter(Boolean);
const serverGeminiApiKey = serverGeminiApiKeys[serverGeminiApiKeys.length - 1] || '';
const serverOpenAIKey = process.env.OPENAI_API_KEY || '';
const serverGroqKey = process.env.GROQ_API_KEY || '';

const serverAi = serverGeminiApiKey ? new GoogleGenAI({ apiKey: serverGeminiApiKey }) : null;
const serverOpenai = serverOpenAIKey ? new OpenAI({ apiKey: serverOpenAIKey }) : null;
const serverGroq = serverGroqKey ? new Groq({ apiKey: serverGroqKey }) : null;

const oauth2Client = new OAuth2Client(
  process.env.VITE_GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
);

const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...configuredOrigins, 'http://localhost:5173', 'http://127.0.0.1:5173'])];
const isTrustedOrigin = (req) => !req.get('origin') || allowedOrigins.includes(req.get('origin'));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

const blockedAddresses = new BlockList();
[
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
  ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['::ffff:0:0', 96]
].forEach(([address, prefix]) => blockedAddresses.addSubnet(address, prefix, address.includes(':') ? 'ipv6' : 'ipv4'));

async function fetchPublicHttps(rawUrl) {
  const target = new URL(rawUrl);
  if (target.protocol !== 'https:' || target.username || target.password) {
    throw new Error('Only public HTTPS image URLs are allowed.');
  }
  const host = target.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    throw new Error('Private network hosts are not allowed.');
  }
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address, family }) => blockedAddresses.check(address, family === 6 ? 'ipv6' : 'ipv4'))) {
    throw new Error('Private or reserved network addresses are not allowed.');
  }
  return fetch(target, { redirect: 'error', signal: AbortSignal.timeout(10000) });
}

async function readLimitedBody(response, maximumBytes = 8 * 1024 * 1024) {
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > maximumBytes) throw new Error('Remote file exceeds the allowed size.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Remote response had no body.');
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new Error('Remote file exceeds the allowed size.');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

async function analyzeImageVision(base64Data, mimeType, prompt) {
  if (!serverAi && !serverOpenai && !serverGroq) {
    throw new Error('No AI vision provider configured on the server. Please add GEMINI_API_KEY, OPENAI_API_KEY, or GROQ_API_KEY.');
  }

  const textFromResponse = (response) => {
    if (!response) return undefined;
    if (typeof response === 'string') return response;
    return response.text || response.tags || response?.choices?.[0]?.message?.content || undefined;
  };

  if (serverAi) {
    const visionModels = [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];

    for (const model of visionModels) {
      try {
        const response = await serverAi.models.generateContent({
          model,
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType } },
              { text: prompt }
            ]
          }
        });
        const text = textFromResponse(response);
        if (text) return text;
      } catch (err) {
        console.warn(`Server Gemini vision model ${model} failed:`, err?.message || err);
      }
    }
  }

  if (serverOpenai) {
    try {
      const response = await serverOpenai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ]
          }
        ]
      });
      const text = textFromResponse(response);
      if (text) return text;
    } catch (err) {
      console.warn('Server OpenAI vision fallback failed:', err?.message || err);
    }
  }

  if (serverGroq) {
    try {
      const response = await serverGroq.chat.completions.create({
        model: 'llama-3.2-11b-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ]
          }
        ]
      });
      const text = textFromResponse(response);
      if (text) return text;
    } catch (err) {
      console.warn('Server Groq vision fallback failed:', err?.message || err);
    }
  }

  throw new Error('AI vision generation failed on the server. Please check your API keys and try again.');
}

async function generateServerContent(prompt, systemInstruction) {
  if (!serverAi && !serverOpenai && !serverGroq) {
    throw new Error('No AI content provider configured on the server. Add GEMINI_API_KEY, OPENAI_API_KEY, or GROQ_API_KEY.');
  }

  const parseText = (response) => {
    if (!response) return undefined;
    if (typeof response === 'string') return response;
    if (response.text) return response.text;
    if (response?.choices?.[0]?.message?.content) return response.choices[0].message.content;
    if (response?.candidates?.[0]?.content?.parts) {
      return response.candidates[0].content.parts.map((part) => part.text || '').join('');
    }
    return undefined;
  };

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

  if (serverAi) {
    for (const model of models) {
      try {
        const response = await serverAi.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: systemInstruction || 'You are a helpful assistant.'
          }
        });
        const text = parseText(response);
        if (text) return text;
      } catch (err) {
        console.warn(`Server Gemini content model ${model} failed:`, err?.message || err);
      }
    }
  }

  if (serverOpenai) {
    try {
      const response = await serverOpenai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction || 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ]
      });
      const text = parseText(response);
      if (text) return text;
    } catch (err) {
      console.warn('Server OpenAI content fallback failed:', err?.message || err);
    }
  }

  if (serverGroq) {
    try {
      const response = await serverGroq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemInstruction || 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ]
      });
      const text = parseText(response);
      if (text) return text;
    } catch (err) {
      console.warn('Server Groq content fallback failed:', err?.message || err);
    }
  }

  throw new Error('Server AI content generation failed. Check available provider keys.');
}

async function generateServerImage(prompt) {
  const seed = Math.floor(Math.random() * 1000000);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;

  if (!serverAi && !serverOpenai) {
    return imageUrl;
  }

  try {
    const response = await serverAi?.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts: [{ text: prompt }] }
    });
    const part = response?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (part?.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  } catch (err) {
    console.warn('Server Gemini image fallback failed:', err?.message || err);
  }

  if (serverOpenai) {
    try {
      const response = await serverOpenai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json'
      });
      const b64 = response.data?.[0]?.b64_json;
      if (b64) {
        return `data:image/png;base64,${b64}`;
      }
    } catch (err) {
      console.warn('Server OpenAI DALL-E fallback failed:', err?.message || err);
    }
  }

  return imageUrl;
}

async function generateServerAudio(prompt) {
  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.VIDEO_AUDIO_API_KEY;
  if (!apiKey) {
    throw new Error('No ElevenLabs API key configured on the server.');
  }

  const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      accept: 'audio/mpeg'
    },
    body: JSON.stringify({ text: prompt.substring(0, 500), duration_seconds: 5 })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ElevenLabs API returned ${response.status}: ${body}`);
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg';
  const buffer = Buffer.from(await response.arrayBuffer());
  const base64 = buffer.toString('base64');
  return `data:${contentType};base64,${base64}`;
}

const uploadDir = join(dirname(fileURLToPath(import.meta.url)), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.set('trust proxy', 1);
const getUploadedFileUrl = (req, filename) => `${(process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')}/uploads/${filename}`;
app.use('/uploads', express.static(uploadDir));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_CONNECTION_STRING || process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_CONNECTION_STRING environment variable is not set.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, { family: 4, serverSelectionTimeoutMS: 5000 })
  .then(() => console.log(`✅ Connected to MongoDB (${MONGODB_URI.includes('mongodb.net') ? 'Atlas Cloud' : 'Atlas'})`))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

// Email Transporter - robust init with Ethereal fallback for local development
let transporter = null;
let etherealAccount = null;

async function initMailer() {
  try {
    const smtpHost = (process.env.SMTP_HOST || '').trim() || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const smtpUser = (process.env.SMTP_USER || '').trim();
    const smtpPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '';

    if (!smtpUser || !smtpPass) {
      console.warn('SMTP credentials missing or incomplete. Creating Ethereal test account for local testing.');
      etherealAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: etherealAccount.smtp.host,
        port: etherealAccount.smtp.port,
        secure: etherealAccount.smtp.secure,
        auth: { user: etherealAccount.user, pass: etherealAccount.pass }
      });
      console.log('✅ Ethereal test account created. Use the preview URL from /api/test-smtp response to view the message.');
    } else {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
        tls: { rejectUnauthorized: false }
      });
    }

    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ SMTP Transporter verify failed:', error?.message || error);
        if (etherealAccount) {
          console.log(`Ethereal credentials: user=${etherealAccount.user} pass=${etherealAccount.pass}`);
        }
      } else {
        console.log('✅ SMTP transporter ready to send messages');
      }
    });
  } catch (err) {
    console.error('Failed to initialize mailer:', err?.message || err);
  }
}

initMailer();

// Test SMTP endpoint
app.post('/api/test-smtp', async (req, res) => {
  if (!isTrustedOrigin(req)) return res.status(403).json({ error: 'Untrusted request origin.' });
  try {
    const tokenValue = req.headers.cookie?.match(/(?:^|;\s*)pagepilot_session=([^;]+)/)?.[1];
    if (!tokenValue) return res.status(401).json({ error: 'Authentication required.' });
    const session = await Session.findOne({ tokenHash: hashSessionToken(decodeURIComponent(tokenValue)), expiresAt: { $gt: new Date() } });
    const user = session ? await User.findOne({ uid: session.userId }) : null;
    if (user?.role !== 'admin') return res.status(403).json({ error: 'Administrator access required.' });
    if (!transporter) return res.status(500).json({ error: 'Mailer not initialized' });
    const to = req.body?.to || process.env.TEST_EMAIL_TO || process.env.SMTP_USER || 'local@localhost';
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || `no-reply@localhost`;

    const info = await transporter.sendMail({
      from,
      to,
      subject: 'Artisan Workshop - SMTP Test',
      text: 'This is a test message sent by the local Artisan Workshop backend to verify SMTP settings.'
    });

    const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
    res.json({ success: true, messageId: info.messageId, previewUrl });
  } catch (err) {
    console.error('Test SMTP send failed:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Failed to send test email' });
  }
});

// Models
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: String,
  displayName: String,
  passwordHash: String,
  role: { type: String, default: 'author' },
  avatarUrl: String,
  bio: String,
  jobTitle: String,
  location: String,
  occupation: String,
  website: String,
  notificationToggles: Object,
  plugins: [String],
  recentHistory: [Object]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const sessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });
const Session = mongoose.model('Session', sessionSchema);

const sessionCookieName = 'pagepilot_session';
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const hashSessionToken = (token) => createHash('sha256').update(token).digest('hex');
const publicUser = (user) => {
  const value = user.toObject ? user.toObject() : { ...user };
  delete value.passwordHash;
  return value;
};

async function createSession(user, res) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);
  await Session.create({ tokenHash: hashSessionToken(token), userId: user.uid, expiresAt });
  res.cookie(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    expires: expiresAt
  });
  return publicUser(user);
}

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Administrator access required' });
  next();
};

const notificationSchema = new mongoose.Schema({
  userId: String,
  title: String,
  message: String,
  type: String,
  read: { type: Boolean, default: false },
  link: String,
  persistent: Boolean
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

const postSchema = new mongoose.Schema({
  title: String,
  slug: { type: String, unique: true },
  content: String,
  status: String,
  category: String,
  authorId: String,
  excerpt: String,
  tags: Array,
  featuredImage: String,
  seoTitle: String,
  seoDescription: String,
  views: { type: Number, default: 0 },
  secondsSpent: { type: Number, default: 0 },
  comments: Array
}, { timestamps: true });

const Post = mongoose.model('Post', postSchema);

const mediaSchema = new mongoose.Schema({
  name: String,
  type: String,
  url: String,
  audioUrl: String,
  size: String,
  sizeBytes: Number,
  ownerId: String,
  icon: String,
  color: String,
  tags: [String]
}, { timestamps: true });

const Media = mongoose.model('Media', mediaSchema);

const siteSchema = new mongoose.Schema({
  name: String,
  goal: String,
  userId: String,
  sections: Array,
  style: Object
}, { timestamps: true });

const Site = mongoose.model('Site', siteSchema);

// Public authentication endpoints issue opaque, HttpOnly database-backed sessions.
app.post('/api/auth/register', async (req, res) => {
  if (!isTrustedOrigin(req)) return res.status(403).json({ error: 'Untrusted request origin.' });
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const displayName = String(req.body.displayName || '').trim();
    const password = String(req.body.password || '');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (password.length < 12 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be between 12 and 128 characters.' });
    }
    if (!displayName || displayName.length > 120) {
      return res.status(400).json({ error: 'Enter a name no longer than 120 characters.' });
    }
    if (await User.exists({ email })) return res.status(409).json({ error: 'An account already exists for this email.' });

    const user = await User.create({
      uid: `user-${randomBytes(16).toString('hex')}`,
      email,
      displayName,
      role: 'author',
      passwordHash: await bcrypt.hash(password, 12)
    });
    res.status(201).json(await createSession(user, res));
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Account registration failed. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!isTrustedOrigin(req)) return res.status(403).json({ error: 'Untrusted request origin.' });
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const user = await User.findOne({ email });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    res.json(await createSession(user, res));
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  if (!isTrustedOrigin(req)) return res.status(403).json({ error: 'Untrusted request origin.' });
  try {
    const code = String(req.body.code || '');
    if (!code) return res.status(400).json({ error: 'Auth code is required.' });
    const { tokens } = await oauth2Client.getToken(code);
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.VITE_GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({ error: 'Google account email could not be verified.' });
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ $or: [{ uid: payload.sub }, { email }] });
    if (!user) {
      user = await User.create({
        uid: payload.sub,
        email,
        displayName: payload.name || email.split('@')[0],
        role: 'author',
        avatarUrl: payload.picture
      });
      await Notification.create({
        userId: user.uid,
        title: 'Welcome to Page Pilot!',
        message: 'We are thrilled to have you here. Start writing your first masterpiece!',
        type: 'welcome',
        read: false
      });
    }
    res.json(await createSession(user, res));
  } catch (error) {
    console.error('Google Auth failed:', error.message);
    res.status(401).json({ error: 'Google authentication failed. Please try again.' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  if (!isTrustedOrigin(req)) return res.status(403).json({ error: 'Untrusted request origin.' });
  const token = req.headers.cookie?.match(/(?:^|;\s*)pagepilot_session=([^;]+)/)?.[1];
  if (token) await Session.deleteOne({ tokenHash: hashSessionToken(decodeURIComponent(token)) });
  res.clearCookie(sessionCookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  });
  res.json({ success: true });
});

app.use('/api', async (req, res, next) => {
  try {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !isTrustedOrigin(req)) {
      return res.status(403).json({ error: 'Untrusted request origin.' });
    }
    const isPublicPublishedList = req.method === 'GET' && req.path === '/posts' && req.query.status === 'published';
    const isPublicView = req.method === 'POST' && /^\/posts\/[^/]+\/view$/.test(req.path);
    if (isPublicPublishedList || isPublicView) return next();
    if (req.method === 'GET' && /^\/posts\/[^/]+$/.test(req.path)) {
      const publicPost = await Post.findOne({ slug: req.path.slice('/posts/'.length), status: 'published' });
      if (publicPost) return next();
    }

    const tokenValue = req.headers.cookie?.match(/(?:^|;\s*)pagepilot_session=([^;]+)/)?.[1];
    if (!tokenValue) return res.status(401).json({ error: 'Authentication required.' });
    const token = decodeURIComponent(tokenValue);
    const session = await Session.findOne({ tokenHash: hashSessionToken(token), expiresAt: { $gt: new Date() } });
    if (!session) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    const user = await User.findOne({ uid: session.userId });
    if (!user) return res.status(401).json({ error: 'Account not found.' });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', (req, res) => res.json(publicUser(req.user)));

app.get('/api/users', requireAdmin, async (req, res) => {
  const users = await User.find().select('-passwordHash');
  res.json(users);
});

app.patch('/api/users/:id', async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && String(req.user._id) !== req.params.id) {
    return res.status(403).json({ error: 'You may only update your own profile.' });
  }
  const allowedFields = ['displayName', 'avatarUrl', 'bio', 'jobTitle', 'location', 'occupation', 'website', 'notificationToggles', 'plugins', 'recentHistory'];
  if (isAdmin) allowedFields.push('role');
  const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowedFields.includes(key)));
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No permitted profile fields provided.' });
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json(user);
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get('/api/posts', async (req, res) => {
  const uid = req.user.uid;
  const { status, category, limit } = req.query;
  let query = {};
  
  if (status === 'published') {
    query.status = 'published';
  } else {
    query.authorId = uid;
    if (status) query.status = status;
  }
  if (category) query.category = category;
  
  let posts = await Post.find(query).sort({ createdAt: -1 });
  if (limit) posts = posts.slice(0, parseInt(limit));
  
  // Attach user info
  const postsWithAuthors = await Promise.all(posts.map(async (p) => {
    const postObj = p.toObject ? p.toObject() : p;
    const author = await User.findOne({ uid: postObj.authorId });
    if (author) {
      postObj.authorName = author.displayName || author.email?.split('@')[0];
      postObj.authorPhotoURL = author.avatarUrl || author.photoURL;
    }
    return postObj;
  }));
  res.json(postsWithAuthors);
});

app.get('/api/posts/:slug', async (req, res) => {
  try {
    let post = await Post.findOne({ slug: req.params.slug });
    if (!post && req.params.slug.match(/^[0-9a-fA-F]{24}$/)) {
      post = await Post.findById(req.params.slug);
    }
    if (!post || (post.status !== 'published' && post.authorId !== req.user.uid && req.user.role !== 'admin')) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const postObj = post.toObject ? post.toObject() : post;
    const author = await User.findOne({ uid: postObj.authorId });
    if (author) {
      postObj.authorName = author.displayName || author.email?.split('@')[0];
      postObj.authorPhotoURL = author.avatarUrl || author.photoURL;
    }
    
    res.json(postObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const uid = req.user.uid;
    const payload = { ...req.body, authorId: uid };
    if (req.user.role !== 'admin') payload.status = 'draft';
    const post = await Post.create(payload);
    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/posts/:id', async (req, res) => {
  try {
    const uid = req.user.uid;
    const user = await User.findOne({ uid });
    const query = user?.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, authorId: uid };
    
    const allowedFields = ['title', 'slug', 'content', 'status', 'category', 'excerpt', 'tags', 'featuredImage', 'seoTitle', 'seoDescription'];
    const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowedFields.includes(key)));
    if (user?.role !== 'admin' && updates.status === 'published') {
      return res.status(403).json({ error: 'Only administrators may publish posts.' });
    }
    const post = await Post.findOneAndUpdate(query, updates, { new: true, runValidators: true });
    if (!post) return res.status(404).json({ error: 'Post not found or unauthorized' });
    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  const uid = req.user.uid;
  await Post.findOneAndDelete({ _id: req.params.id, authorId: uid });
  res.json({ success: true });
});

app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || (post.status !== 'published' && post.authorId !== req.user.uid && req.user.role !== 'admin')) return res.status(404).json({ error: 'Post not found' });
    
    const newComment = {
      _id: new mongoose.Types.ObjectId().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
      replies: []
    };
    
    post.comments = post.comments || [];
    post.comments.push(newComment);
    
    // Mongoose mixed array modification
    post.markModified('comments');
    await post.save();
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts/:id/comments/:commentId/reply', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || (post.status !== 'published' && post.authorId !== req.user.uid && req.user.role !== 'admin')) return res.status(404).json({ error: 'Post not found' });
    
    const commentIndex = post.comments.findIndex((c, idx) => 
      c._id === req.params.commentId || 
      c.id === req.params.commentId || 
      idx.toString() === req.params.commentId
    );
    if (commentIndex === -1) return res.status(404).json({ error: 'Comment not found' });
    
    const reply = {
      _id: new mongoose.Types.ObjectId().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    
    post.comments[commentIndex].replies = post.comments[commentIndex].replies || [];
    post.comments[commentIndex].replies.push(reply);
    
    post.markModified('comments');
    await post.save();
    
    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/posts/:id/view', async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate({ _id: req.params.id, status: 'published' }, { $inc: { views: 1 } }, { new: true });
    res.json({ success: true, views: post?.views });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/posts/:id/time', async (req, res) => {
  try {
    const { seconds } = req.body;
    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { secondsSpent: seconds } }, { new: true });
    res.json({ success: true, secondsSpent: post?.secondsSpent });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/media', async (req, res) => {
  const uid = req.user.uid;
  const media = await Media.find({ ownerId: uid }).sort({ createdAt: -1 });
  res.json(media);
});

app.post('/api/media', async (req, res) => {
  try {
    const uid = req.user.uid;
    let payload = { ...req.body, ownerId: uid };
    
    if (typeof payload.url === 'string' && payload.url.startsWith('data:')) {
      const matches = payload.url.match(/^data:(image\/(?:jpeg|png|webp|gif)|audio\/(?:mpeg|wav|ogg|mp4)|video\/(?:mp4|webm));base64,([A-Za-z0-9+/=]+)$/i);
      if (!matches) return res.status(415).json({ error: 'Unsupported media type.' });
      const buffer = Buffer.from(matches[2], 'base64');
      if (!buffer.length || buffer.length > 8 * 1024 * 1024) return res.status(413).json({ error: 'Media uploads must be 8 MB or smaller.' });
      const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'video/mp4': 'mp4', 'video/webm': 'webm' };
      const contentType = matches[1].toLowerCase();
      const filename = `${Date.now()}-${randomBytes(4).toString('hex')}.${extensions[contentType]}`;
      fs.writeFileSync(join(uploadDir, filename), buffer, { flag: 'wx' });
      payload.url = getUploadedFileUrl(req, filename);
    }
    
    const item = await Media.create(payload);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/media/:id', async (req, res) => {
  const uid = req.user.uid;
  const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => ['name', 'type', 'size', 'icon', 'color', 'tags'].includes(key)));
  const item = await Media.findOneAndUpdate({ _id: req.params.id, ownerId: uid }, updates, { new: true });
  res.json(item);
});

app.delete('/api/media/:id', async (req, res) => {
  const uid = req.user.uid;
  await Media.findOneAndDelete({ _id: req.params.id, ownerId: uid });
  res.json({ success: true });
});

app.get('/api/sites', async (req, res) => {
  const uid = req.user.uid;
  const sites = await Site.find({ userId: uid }).sort({ updatedAt: -1 });
  res.json(sites);
});

app.post('/api/sites', async (req, res) => {
  const uid = req.user.uid;
  const site = await Site.create({ ...req.body, userId: uid });
  res.json(site);
});

app.patch('/api/sites/:id', async (req, res) => {
  const uid = req.user.uid;
  const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => ['name', 'goal', 'sections', 'style'].includes(key)));
  const site = await Site.findOneAndUpdate({ _id: req.params.id, userId: uid }, updates, { new: true });
  res.json(site);
});

app.delete('/api/sites/:id', async (req, res) => {
  const uid = req.user.uid;
  await Site.findOneAndDelete({ _id: req.params.id, userId: uid });
  res.json({ success: true });
});

// Settings
const settingSchema = new mongoose.Schema({
  userId: String,
  siteName: { type: String, default: 'Page Pilot' },
  siteDescription: String,
  theme: { type: String, default: 'Natural' },
  languages: { type: Array, default: ['English'] },
  timezone: String,
  primaryColor: String,
  accentColor: String,
  aiProvider: String,
  notificationToggles: Object,
  pricingPlans: Array
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);

app.get('/api/settings', async (req, res) => {
  const uid = req.user.uid;
  let settings = await Setting.findOne({ userId: uid });
  if (!settings) {
    settings = await Setting.create({ siteName: 'Page Pilot', userId: uid });
  }
  res.json(settings);
});

app.patch('/api/settings', async (req, res) => {
  const uid = req.user.uid;
  const allowedFields = ['siteName', 'siteDescription', 'theme', 'languages', 'timezone', 'primaryColor', 'accentColor', 'aiProvider', 'notificationToggles', 'pricingPlans'];
  const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowedFields.includes(key)));
  const settings = await Setting.findOneAndUpdate({ userId: uid }, updates, { new: true, upsert: true });
  res.json(settings);
});



// Orders
const orderSchema = new mongoose.Schema({
  userId: String,
  customerName: String,
  customerEmail: String,
  shippingAddress: String,
  items: Array,
  total: Number,
  status: String
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

// Invitations
const invitationSchema = new mongoose.Schema({
  email: { type: String, required: true },
  role: { type: String, default: 'author' },
  siteName: { type: String },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: 'pending' }
}, { timestamps: true });

const Invitation = mongoose.model('Invitation', invitationSchema);

// Invitation endpoint
app.post('/api/invitations', requireAdmin, async (req, res) => {
  try {
    const { email, role = 'author', siteName = '' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const token = randomBytes(16).toString('hex');
    const invitation = await Invitation.create({ email, role, siteName, token });
    // Send email if transporter is configured
    if (transporter) {
      const inviteLink = `${process.env.CLIENT_URL || 'https://pagepilot--pcoo05758.replit.app'}/signup?token=${token}&role=${role}`;
      const mailOptions = {
        from: process.env.SMTP_USER || 'no-reply@artisan.workshop',
        to: email,
        subject: `You're invited to join ${siteName || 'Artisan Workshop'}`,
        text: `Hello!\n\nYou've been invited to join ${siteName || 'Artisan Workshop'} as a ${role}. Please click the link below to accept the invitation:\n${inviteLink}\n\nIf you didn't expect this, you can ignore this email.`
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.error('Invitation email send error:', err);
        else console.log('Invitation email sent:', info.messageId);
      });
    }
    res.json({ success: true, invitationId: invitation._id, token });
  } catch (err) {
    console.error('Invitation creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  const uid = req.user.uid;
  const orders = await Order.find({ userId: uid }).sort({ createdAt: -1 });
  res.json(orders);
});

app.post('/api/orders', async (req, res) => {
  const uid = req.user.uid;
  const order = await Order.create({ ...req.body, userId: uid });
  res.json(order);
});

app.patch('/api/orders/:id', async (req, res) => {
  const uid = req.user.uid;
  const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => ['customerName', 'customerEmail', 'shippingAddress', 'items', 'total', 'status'].includes(key)));
  const order = await Order.findOneAndUpdate({ _id: req.params.id, userId: uid }, updates, { new: true });
  res.json(order);
});

app.delete('/api/orders', async (req, res) => {
  const uid = req.user.uid;
  await Order.deleteMany({ userId: uid });
  res.json({ success: true });
});

// Feedback
const feedbackSchema = new mongoose.Schema({
  userId: String,
  userEmail: String,
  type: String,
  subject: String,
  message: String
}, { timestamps: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);

app.get('/api/feedback', async (req, res) => {
  const uid = req.user.uid;
  const user = await User.findOne({ uid });
  
  let query = {};
  if (user && user.role !== 'admin') {
    query = { userId: uid };
  }
  
  const feedback = await Feedback.find(query).sort({ createdAt: -1 });
  res.json(feedback);
});

app.post('/api/feedback', async (req, res) => {
  const uid = req.user.uid;
  const user = await User.findOne({ uid });
  const feedback = await Feedback.create({ 
    ...req.body, 
    userId: uid,
    userEmail: user ? user.email : 'Unknown'
  });
  res.json(feedback);
});

// Admin Logs
const adminLogSchema = new mongoose.Schema({
  action: String,
  detail: String,
  adminId: String,
  adminEmail: String,
  adminName: String
}, { timestamps: true });

const AdminLog = mongoose.model('AdminLog', adminLogSchema);

app.get('/api/admin-logs', requireAdmin, async (req, res) => {
  try {
    const logs = await AdminLog.find({}).sort({ createdAt: -1 }).limit(100);
    const uids = [...new Set(logs.map(l => l.adminId).filter(Boolean))];
    const users = await User.find({ uid: { $in: uids } }).select('uid email displayName');
    
    const userMap = {};
    users.forEach(u => {
      userMap[u.uid] = u;
    });

    const populatedLogs = logs.map(log => {
      const l = log.toObject();
      if (!l.adminEmail && l.adminId && userMap[l.adminId]) {
        l.adminEmail = userMap[l.adminId].email;
        l.adminName = userMap[l.adminId].displayName;
      }
      return l;
    });

    res.json(populatedLogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin-logs', requireAdmin, async (req, res) => {
  const log = await AdminLog.create({
    action: String(req.body.action || '').slice(0, 120),
    detail: String(req.body.detail || '').slice(0, 2000),
    adminId: req.user.uid,
    adminEmail: req.user.email,
    adminName: req.user.displayName
  });
  res.json(log);
});

// Products
const productSchema = new mongoose.Schema({
  userId: String,
  name: String,
  price: Number,
  stock: Number,
  category: String,
  status: String,
  images: Array,
  description: String,
  imageUrl: String
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

app.get('/api/products', async (req, res) => {
  const uid = req.user.uid;
  const products = await Product.find({ userId: uid }).sort({ createdAt: -1 });
  res.json(products);
});

app.post('/api/products', async (req, res) => {
  const uid = req.user.uid;
  const product = await Product.create({ ...req.body, userId: uid });
  res.json(product);
});

app.patch('/api/products/:id', async (req, res) => {
  const uid = req.user.uid;
  const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => ['name', 'price', 'stock', 'category', 'status', 'images', 'description', 'imageUrl'].includes(key)));
  const product = await Product.findOneAndUpdate({ _id: req.params.id, userId: uid }, updates, { new: true });
  res.json(product);
});

app.delete('/api/products/:id', async (req, res) => {
  const uid = req.user.uid;
  await Product.findOneAndDelete({ _id: req.params.id, userId: uid });
  res.json({ success: true });
});

app.delete('/api/products', async (req, res) => {
  const uid = req.user.uid;
  await Product.deleteMany({ userId: uid });
  res.json({ success: true });
});

// Proxy and rehost remote images to avoid CORS issues when the browser cannot fetch them
app.post('/api/proxy-image', async (req, res) => {
  try {
    const { url, name } = req.body;
    if (typeof url !== 'string' || url.length > 2048) return res.status(400).json({ error: 'A valid image URL is required.' });

    const response = await fetchPublicHttps(url);
    if (!response.ok) return res.status(502).json({ error: 'Failed to fetch remote image.' });
    const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
    const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    if (!extensions[contentType]) return res.status(415).json({ error: 'Only JPEG, PNG, WebP, and GIF images are supported.' });
    const filename = `${Date.now()}-${randomBytes(4).toString('hex')}.${extensions[contentType]}`;
    const filepath = join(uploadDir, filename);
    const buffer = await readLimitedBody(response);
    fs.writeFileSync(filepath, buffer);

    const fileUrl = getUploadedFileUrl(req, filename);

    // Create a Media item tied to the requesting user
    const uid = req.user.uid || 'local-user-id';
    const item = await Media.create({
      name: name || filename,
      type: 'image',
      url: fileUrl,
      size: `${Math.round(buffer.length / 1024)} KB`,
      sizeBytes: buffer.length,
      ownerId: uid
    });

    res.json(item);
  } catch (err) {
    console.error('Proxy image error:', err.message || err);
    res.status(500).json({ error: err.message || 'Proxy failed' });
  }
});

app.post('/api/vision-tags', async (req, res) => {
  try {
    const { url, base64, mimeType, prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    let imageBase64 = base64;
    let effectiveMimeType = mimeType || 'image/jpeg';

    if (!imageBase64) {
      if (!url) {
        return res.status(400).json({ error: 'Missing image url or base64 data' });
      }

      if (url.startsWith('data:')) {
        const matches = url.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/i);
        if (!matches || Buffer.byteLength(matches[2], 'base64') > 8 * 1024 * 1024) {
          return res.status(400).json({ error: 'Provide a supported image under 8 MB.' });
        }
        effectiveMimeType = matches[1].toLowerCase();
        imageBase64 = matches[2];
      } else {
        const response = await fetchPublicHttps(url);
        if (!response.ok) return res.status(502).json({ error: 'Failed to fetch remote image.' });
        effectiveMimeType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(effectiveMimeType)) {
          return res.status(415).json({ error: 'Remote URL must return a supported image.' });
        }
        imageBase64 = (await readLimitedBody(response)).toString('base64');
      }
    }

    const tags = await analyzeImageVision(imageBase64, effectiveMimeType, prompt);
    res.json({ tags });
  } catch (err) {
    console.error('Vision tags error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Vision tagging failed' });
  }
});

app.post('/api/ai/content', async (req, res) => {
  try {
    const { prompt, systemInstruction } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    const text = await generateServerContent(prompt, systemInstruction);
    res.json({ text });
  } catch (err) {
    console.error('AI content error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'AI content generation failed' });
  }
});

app.post('/api/media/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    const url = await generateServerImage(prompt);
    res.json({ url });
  } catch (err) {
    console.error('Image generation error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Image generation failed' });
  }
});

app.post('/api/audio/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    const audioDataUrl = await generateServerAudio(prompt);
    res.json({ audioDataUrl });
  } catch (err) {
    console.error('Audio generation error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Audio generation failed' });
  }
});

app.get('/api/media/stock-search', async (req, res) => {
  try {
    const type = String(req.query.type || 'photos');
    const query = String(req.query.query || '');

    if (!query) {
      return res.status(400).json({ error: 'Missing query' });
    }

    if (type === 'photos') {
      const key = process.env.UNSPLASH_ACCESS_KEY;
      if (!key) return res.status(500).json({ error: 'Unsplash access key not configured' });
      const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12`, {
        headers: { Authorization: `Client-ID ${key}` }
      });
      const data = await response.json();
      return res.json(data);
    }

    if (type === 'videos') {
      const key = process.env.PEXELS_API_KEY;
      if (!key) return res.status(500).json({ error: 'Pexels API key not configured' });
      const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=12`, {
        headers: { Authorization: key }
      });
      const data = await response.json();
      return res.json(data);
    }

    if (type === 'audio') {
      const key = process.env.PIXABAY_API_KEY;
      if (!key) return res.status(500).json({ error: 'Pixabay API key not configured' });
      const response = await fetch(`https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&per_page=12`);
      const data = await response.json();
      return res.json(data);
    }

    res.status(400).json({ error: 'Unsupported stock search type' });
  } catch (err) {
    console.error('Stock search error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Stock search failed' });
  }
});

// Themes
const themeSchema = new mongoose.Schema({
  name: String,
  primary: String,
  accent: String,
  font: String,
  radius: String,
  isCustom: Boolean,
  userId: String
}, { timestamps: true });

const Theme = mongoose.model('Theme', themeSchema);

app.get('/api/themes', async (req, res) => {
  const uid = req.user.uid;
  const themes = await Theme.find({ userId: uid }).sort({ createdAt: -1 });
  res.json(themes);
});

app.post('/api/themes', async (req, res) => {
  const uid = req.user.uid;
  try {
    const theme = new Theme({ ...req.body, userId: uid });
    await theme.save();
    res.status(201).json(theme);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/themes/:id', async (req, res) => {
  const uid = req.user.uid;
  try {
    const theme = await Theme.findOneAndDelete({ _id: req.params.id, userId: uid });
    if (!theme) return res.status(404).json({ error: 'Theme not found' });
    res.json({ message: 'Theme deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Invitations
app.post('/api/invitations', requireAdmin, async (req, res) => {
  const { email, role, siteName } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const mailOptions = {
      from: `"Artisan Workshop" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Invitation to join ${siteName || 'Artisan Workshop'}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4f46e5;">You've been invited!</h2>
          <p>Hello,</p>
          <p>You have been invited to join <strong>${siteName || 'Artisan Workshop'}</strong> as a <strong>${role || 'Editor'}</strong>.</p>
          <div style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://pagepilot--pcoo05758.replit.app'}/signup?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role || 'editor')}" 
               style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">Sent via Artisan Workshop - The modern CMS</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Invitation sent to ${email}`);
    res.json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('❌ Error sending invitation:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// System Seed
app.post('/api/system/seed', requireAdmin, async (req, res) => {
  // Add some sample data if needed
  res.json({ message: 'System seeded successfully' });
});

// Notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const userId = req.user.uid;
    const filter = userId ? { userId } : {};
    let notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    // map _id to id
    notifications = notifications.map(n => {
      const obj = n.toObject();
      obj.id = obj._id;
      return obj;
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const notification = new Notification({
      ...req.body,
      userId: req.user.uid
    });
    const saved = await notification.save();
    const obj = saved.toObject();
    obj.id = obj._id;
    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/read-all', async (req, res) => {
  try {
    const userId = req.user.uid;
    if (userId) {
      await Notification.updateMany({ userId, read: false }, { read: true });
    }
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.uid }, { read: true });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/notifications', async (req, res) => {
  try {
    const userId = req.user.uid;
    if (userId) {
      await Notification.deleteMany({ userId });
    }
    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.uid });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// JSON2Video Generation
app.post('/api/videos/generate', async (req, res) => {
  const { prompt } = req.body;
  
  if (!process.env.JSON2VIDEO_API_KEY) {
    return res.status(500).json({ error: 'JSON2Video API key not configured' });
  }

  try {
    const response = await fetch('https://api.json2video.com/v2/movies', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.JSON2VIDEO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        draft: false,
        scenes: [
          {
            comment: "Scene 1 generated by AI",
            elements: [
              {
                type: "text",
                text: prompt,
                style: "color: white; font-size: 60px; text-align: center; font-family: sans-serif;",
                position: "center",
                duration: 5
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to generate video');
    }
    
    res.json({ message: 'Video rendering started', data });
  } catch (error) {
    console.error('JSON2Video Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend in production (Render deployment)
const currentDir = dirname(fileURLToPath(import.meta.url));

// Health check — always returns 200, used by frontend status indicators
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve static files from the React app build
app.use(express.static(join(currentDir, '../frontend/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send // Serve frontend in production
app.get('*', (req, res) => {
  const possiblePaths = [
    join(currentDir, '../dist/index.html'),
    join(currentDir, '../frontend/dist/index.html')
  ];
  
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }
  
  res.status(404).send('Frontend build not found. Please run "npm run build" in the frontend directory first or use the vite dev server.');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});

// Export app for serverless deployment (Vercel)
export default app;
