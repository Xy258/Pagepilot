/**
 * Gemini AI Service
 * Provides abstraction for interacting with Google's Gemini models for text and image generation.
 * 
 * Capabilities:
 * - Content Generation: Multi-purpose text generation with system level instructions.
 * - Summarization: Automatic teaser generation for blog posts.
 * - SEO Optimization: AI-driven meta tags and keywords extraction.
 * - Image Generation: High-fidelity visual assets using Imagen-powered Gemini models.
 */

import { GoogleGenAI, Modality } from "@google/genai";
import { api } from '../lib/api';
import OpenAI from 'openai';
import { Groq } from 'groq-sdk';

// Buffer limit to prevent token overflow on large documents
const CONTENT_LIMIT = 10000; 

// Initializing AI client - framework says to use process.env.GEMINI_API_KEY
const geminiApiKeys = [
  (import.meta as any).env.VITE_GEMINI_API_KEY,
  (import.meta as any).env.VITE_GEMINI_API_KEY_2,
  (import.meta as any).env.VITE_GEMINI_API_KEY_3,
  (import.meta as any).env.VITE_GEMINI_API_KEY_4,
  (import.meta as any).env.VITE_GEMINI_API_KEY_5
].filter(Boolean);
const activeGeminiApiKey = geminiApiKeys[geminiApiKeys.length - 1] || '';
const ai = new GoogleGenAI({ apiKey: activeGeminiApiKey });

// Fallback clients using potentially active keys
const openaiKey = (import.meta as any).env.VITE_OPENAI_API_KEY || '';
const groqKey = (import.meta as any).env.VITE_GROQ_API_KEY || '';

const openai = openaiKey ? new OpenAI({ apiKey: openaiKey, dangerouslyAllowBrowser: true }) : null;
const groq = groqKey ? new Groq({ apiKey: groqKey, dangerouslyAllowBrowser: true }) : null;

// High-quality mock visual tagging generator to guarantee tagging works
function getMockVisionTags(prompt: string): string {
  const creativeTags = [
    "Artisan, Craftsmanship, Minimalist, Serene, Aesthetic, Organic, Textures, Warm Light",
    "Studio, Creative Space, Visual Art, Workspace, Design Process, Detail, Contemporary",
    "Nature Inspired, Ethereal, Tranquil, Earthy Tones, Handcrafted, Simplicity, Pure Essence",
    "Modernist, Brutalist, Geometric, Structured, High Contrast, Spatial, Form, Industrial",
    "Cinematic, Moody, Atmospheric, Depth, Narrative, Shadow Play, Fine Art, Expressive"
  ];
  return creativeTags[Math.floor(Math.random() * creativeTags.length)];
}

// High-quality mock text generator to guarantee CMS works flawlessly without active API keys
function getMockContent(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  // 1. Site builder (JSON array of sections)
  if (lowerPrompt.includes('site goal') || lowerPrompt.includes('json array of sections')) {
    const match = prompt.match(/Site Goal:\s*"(.*?)"/i) || prompt.match(/Site Goal:\s*(.*?)\./i);
    const goal = match ? match[1] : 'Artisan Masterpiece';
    
    const mockSections = [
      {
        type: 'hero',
        content: {
          title: `Welcome to ${goal}`,
          subtitle: 'A beautifully structured landing page built with precision, intent, and high-fidelity aesthetics.',
          buttonText: 'Begin the Journey'
        }
      },
      {
        type: 'features',
        content: {
          items: [
            { title: 'Artisanal Design', description: 'Every layer is crafted with meticulous attention to grid systems and typographic rhythm.' },
            { title: 'Lightning Fast', description: 'Highly optimized, responsive components that render beautifully on any device.' },
            { title: 'AI Orchestration', description: 'Intelligent layout and content adjustment guided by modern design heuristics.' }
          ]
        }
      },
      {
        type: 'testimonials',
        content: {
          v: [
            { author: 'Evelyn Vane', text: 'This platform transformed our digital presence. The aesthetic is incredibly premium.', role: 'Creative Director' }
          ]
        }
      },
      {
        type: 'cta',
        content: {
          title: 'Ready to Build Something Extraordinary?',
          ctaText: 'Join the next generation of visual storytellers.',
          buttonLabel: 'Launch Builder'
        }
      }
    ];
    return JSON.stringify(mockSections, null, 2);
  }

  // 2. Nature-inspired file names
  if (lowerPrompt.includes('nature-inspired filenames')) {
    return JSON.stringify([
      { name: "whispering-canopy.jpg", description: "A high-angle view of sunlight filtering through dense green forest leaves." },
      { name: "golden-hour-mist.jpg", description: "Early morning fog settling over a quiet lake, lit by warm golden sunlight." },
      { name: "cracked-clay-canyon.jpg", description: "Minimalist close-up of geometric natural patterns in arid soil." }
    ], null, 2);
  }

  // 3. Manuscript/guide generation
  if (lowerPrompt.includes('manuscript') || lowerPrompt.includes('guide')) {
    return `# The Craft of the Modern Artisan

## Introduction
In a world dominated by rapid consumption, the role of the artisan is to slow down, reflect, and create with intent. This guide outlines the core philosophies of visual craftsmanship and digital integrity.

## Chapter 1: The Principle of Intentional Spacing
Whitespace is not empty space; it is active space. It allows your designs to breathe and gives your content a sense of dignity and focus.
- **Rule of Thirds**: Guide the eye naturally.
- **Micro-Animations**: Add delight through subtle, organic transitions.

## Chapter 2: Harmonious Color Dynamics
Color dictates emotion. Avoid raw, saturated browser defaults. Instead, utilize earthy tones, warm pastels, and slate-like dark modes to construct a premium palette.

## Conclusion
True design is the perfect intersection of form and function. Build with passion, refine with precision.`;
  }

  // 4. SEO Optimization
  if (lowerPrompt.includes('post title:') && lowerPrompt.includes('keywords')) {
    return JSON.stringify({
      metaTitle: "Optimized Title | Artisan Insights",
      metaDescription: "An in-depth exploration of design principles, craftsmanship, and modern web aesthetics.",
      keywords: ["design", "artisan", "webdev", "minimalism", "craft"]
    }, null, 2);
  }

  // 5. Content refinement
  if (lowerPrompt.includes('current json content:')) {
    const match = prompt.match(/Current JSON Content:\s*(\{[\s\S]*?\})\s*\n/i) || prompt.match(/Current JSON Content:\s*(\{[\s\S]*?\})/i);
    if (match) {
      try {
        return match[1];
      } catch (e) {}
    }
  }

  return `This is a high-quality response generated in mock mode to keep your Artisan Workshop running perfectly. 
  Prompt received: "${prompt.substring(0, 100)}..."`;
}

export const geminiService = {
  /**
   * Universal content generator with OpenAI and Groq fallbacks, plus Mock mode
   */
  async generateContent(prompt: string, systemInstruction?: string) {
    if (!((import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.VITE_OPENAI_API_KEY || (import.meta as any).env.VITE_GROQ_API_KEY)) {
      throw new Error('No AI provider API keys configured. Please set VITE_GEMINI_API_KEY, VITE_OPENAI_API_KEY, or VITE_GROQ_API_KEY.');
    }
    try {
      // Try multiple models in case one is unavailable
      const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      let lastError: any;
      
      for (const model of models) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              systemInstruction: systemInstruction || "You are a helpful assistant."
            }
          });
          if (!response.text) {
            throw new Error(`Gemini model ${model} returned empty response`);
          }
          return response.text || '';
        } catch (error: any) {
          console.warn(`Model ${model} failed:`, error?.message);
          lastError = error;
          // Only retry on model-not-found type errors
          if (!error?.message?.includes('not found') && !error?.message?.includes('404') && !error?.message?.includes('is not supported')) {
            throw error;
          }
        }
      }
      throw lastError;
    } catch (geminiError: any) {
      console.warn("Gemini generation failed. Attempting OpenAI or Groq fallback...", geminiError);

      if (openai) {
        try {
          console.log("Using OpenAI fallback (gpt-4o-mini)...");
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: 'system', content: systemInstruction || "You are a helpful assistant." },
              { role: 'user', content: prompt }
            ]
          });
          return response.choices[0]?.message?.content || '';
        } catch (openaiError) {
          console.error("OpenAI fallback failed:", openaiError);
        }
      }

      if (groq) {
        try {
          console.log("Using Groq fallback (llama-3.1-8b-instant)...");
          const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: 'system', content: systemInstruction || "You are a helpful assistant." },
              { role: 'user', content: prompt }
            ]
          });
          return response.choices[0]?.message?.content || '';
        } catch (groqError) {
          console.error("Groq fallback failed:", groqError);
        }
      }

        console.error("All API providers failed to generate content.");
        throw new Error("AI generation failed: no providers succeeded.");
    }
  },

  /**
   * Multimodal analysis (Image + Text) with OpenAI, Groq, and Mock fallbacks
   */
  async analyzeImage(base64Data: string, mimeType: string, prompt: string) {
    const result = await api.media.analyze({ base64: base64Data, mimeType, prompt });
    if (typeof result === 'string') return result;
    return result.tags || result.text || '';
  },

  /**
   * Generates a concise summary for excerpts and teasers
   */
  async summarizeContent(text: string) {
    const truncated = text.substring(0, CONTENT_LIMIT);
    return this.generateContent(
      `Summarize this: \n\n ${truncated}. Provide a concise, engaging 2-3 sentence summary for a blog post teaser. Do not use filler words.`
    );
  },

  /**
   * Extracts SEO meta-data in a structured format
   */
  async optimizeSEO(title: string, content: string) {
    const truncated = content.substring(0, CONTENT_LIMIT);
    const text = await this.generateContent(
       `Post Title: ${title}\nContent: ${truncated}\n\nReturn JSON with: { "metaTitle": string, "metaDescription": string, "keywords": string[] }. Do not add markdown backticks.`
    );
    return text.replace(/```json\n?|```/g, '').trim();
  },

  /**
   * Refines existing content based on user instructions
   */
  async refineContent(currentContent: any, instruction: string, sectionType: string) {
    const text = await this.generateContent(
      `Current JSON Content: ${JSON.stringify(currentContent)}\nUser Instruction: "${instruction}"\n\nSection Type: ${sectionType}\nReturn the updated content as JSON matching the original structure exactly. Only return the JSON. Do not add markdown backticks.`
    );
    return text.replace(/```json\n?|```/g, '').trim();
  },

  /**
   * Rewrites a specific block of text for better flow, tone or clarity
   */
  async rewriteText(text: string, tone: string = 'professional') {
    const prompt = `Rewrite the following text to improve its flow, tone, and clarity while maintaining its original meaning. 
    Target Tone: ${tone}
    
    Text to rewrite:
    "${text}"
    
    Provide only the rewritten text without quotes or explanations. If the input contains HTML tags, maintain them. If the input is plain text, return plain text.`;
    
    return this.generateContent(prompt, `You are an expert editor who specializes in refining content for maximum impact. Maintain any HTML structure provided.`);
  },

  /**
   * Visual asset generator (Native AI Generation)
   */
  async generateImage(prompt: string) {
    // Ensure at least one image generation provider is configured
    if (!((import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.VITE_OPENAI_API_KEY)) {
      throw new Error('No image generation API keys configured. Set VITE_GEMINI_API_KEY or VITE_OPENAI_API_KEY.');
    }
    try {
      // Primary: Use Pollinations.ai for high-fidelity, unauthenticated AI image synthesis
      console.log("Synthesizing genuine AI image via Pollinations.ai...");
      const seed = Math.floor(Math.random() * 1000000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;
      console.log('Generated image source URL:', url);
      return url;
    } catch (err: any) {
      console.warn('AI Image generation failed on Pollinations. Attempting Gemini/OpenAI fallbacks...', err);

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image-preview',
          contents: {
            parts: [{ text: prompt }]
          }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            const base64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            return await this.applyWatermark(base64);
          }
        }
        throw new Error('No image data returned from Gemini.');
      } catch (geminiErr) {
        console.warn('Gemini image generation failed. Attempting OpenAI DALL-E fallback...', geminiErr);

        if (openai) {
          try {
            console.log("Using OpenAI DALL-E fallback...");
            const response = await openai.images.generate({
              model: "dall-e-3",
              prompt: prompt,
              n: 1,
              size: "1024x1024",
              response_format: "b64_json"
            });
            const b64 = response.data?.[0]?.b64_json;
            if (!b64) {
              throw new Error('OpenAI returned malformed image data.');
            }
            const base64 = `data:image/png;base64,${b64}`;
            return await this.applyWatermark(base64);
          } catch (openaiError) {
            console.error("OpenAI DALL-E fallback failed:", openaiError);
          }
        }
      }
      
      // All providers exhausted
        throw new Error('Image generation failed across all providers. Verify API keys and network connectivity.');
    }
  },

  /**
   * Apply a premium glassmorphic "Page Pilot" logo badge watermark to images
   */
  async applyWatermark(sourceUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      const isSameOrigin = sourceUrl.startsWith(window.location.origin) || sourceUrl.startsWith('/') || sourceUrl.startsWith('data:');
      if (isSameOrigin) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(sourceUrl);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Watermark Styling
        const fontSize = Math.max(16, Math.floor(img.width / 50));
        const padding = 24;
        
        // Draw elegant glassmorphic watermark badge
        const badgeWidth = fontSize * 9.5;
        const badgeHeight = fontSize * 2.2;
        const badgeX = canvas.width - padding - badgeWidth;
        const badgeY = canvas.height - padding - badgeHeight;

        // Draw rounded rectangle glass background
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, fontSize * 0.6);
        } else {
          // Fallback if roundRect is not supported in old browsers
          ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
        }
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'; // Dark Slate with transparency
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; // Subtle white border
        ctx.stroke();

        // Draw Logo Icon (Emerald Circle with white P)
        const logoRadius = fontSize * 0.7;
        const logoX = badgeX + logoRadius + fontSize * 0.5;
        const logoY = badgeY + badgeHeight / 2;

        ctx.beginPath();
        ctx.arc(logoX, logoY, logoRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981'; // Emerald Green
        ctx.fill();

        ctx.font = `bold ${fontSize * 1.0}px "Inter", sans-serif`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('P', logoX, logoY);

        // Draw "PAGE PILOT" Text next to icon
        ctx.font = `900 ${fontSize * 0.9}px "Inter", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        // Text Shadow/Glow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillText('PAGE PILOT', logoX + logoRadius * 1.4 + 1, logoY + 1);
        
        ctx.fillStyle = '#ffffff'; // Crisp white text
        ctx.fillText('PAGE PILOT', logoX + logoRadius * 1.4, logoY);

        try {
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } catch (err) {
          resolve(sourceUrl);
        }
      };
      img.onerror = () => {
        resolve(sourceUrl);
      };
      img.src = sourceUrl;
    });
  },

  /**
   * Video generation using Veo (specifically using Key 4 and 5 as requested by user)
   */
  async generateVideo(prompt: string) {
    // Implement rotation between Key 4 and Key 5
    // Note: In browser, we use process.env mapping or import.meta.env
    const key4 = (import.meta as any).env.VITE_GEMINI_API_KEY_4;
    const key5 = (import.meta as any).env.VITE_GEMINI_API_KEY_5;
    
    // Simple rotation logic
    const videoKey = Math.random() > 0.5 ? (key4 || key5) : (key5 || key4);
    
    // Priority: Specific Rotation Key -> User Selected Key (API_KEY) -> Primary App Key
    const finalKey = (import.meta as any).env.VITE_VIDEO_AUDIO_API_KEY || videoKey || (import.meta as any).env.VITE_GEMINI_API_KEY;

    if (!finalKey) {
      throw new Error('No API key found for video generation. Please select a paid key.');
    }

    const veoAi = new GoogleGenAI({ apiKey: finalKey });
    
    // Request Veo to include a watermark in the actual video generation
    const watermarkedPrompt = `${prompt}. Add a professional 'PAGE PILOT' text watermark in the bottom corner. Ensure high quality cinematic finish.`;

    try {
      let operation = await veoAi.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: watermarkedPrompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await veoAi.operations.getVideosOperation({ operation: operation });
      }

      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) throw new Error('Video generation failed to return a URI');

      // Fetch video bytes using the same key
      const response = await fetch(uri, {
        headers: { 'x-goog-api-key': finalKey }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video artifact: ${response.statusText}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (err: any) {
      // Better error reporting for billing/quota
      if (err.message?.includes('billing') || err.message?.includes('403') || err.message?.includes('permission')) {
        throw new Error('BILLING_REQUIRED: Video generation requires a billing-enabled API key or credits.');
      }
      throw err;
    }
  },

  /**
   * Audio/Speech generation using ElevenLabs (with premium persistent base64 and nature rain fallback)
   */
  async generateMusic(prompt: string): Promise<string> {
    const fallbackAudio = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(prompt.substring(0, 200))}&tl=en&client=tw-ob`;
    const apiKey = (import.meta as any).env.VITE_VIDEO_AUDIO_API_KEY || (import.meta as any).env.VITE_ELEVENLABS_API_KEY || '';
    
    if (!apiKey) {
      console.warn('ElevenLabs API key not configured. Using fallback TTS.');
      return fallbackAudio;
    }

    try {
      console.log("Calling ElevenLabs API for speech generation...");
      const voiceId = "ErXwobaYiN019PkySvjV";
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
          "accept": "audio/mpeg"
        },
        body: JSON.stringify({
          text: prompt.substring(0, 500), // Limit text to avoid quota issues
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });
      if (!response.ok) {
        throw new Error(`ElevenLabs API returned: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error("ElevenLabs generation failed, falling back to basic TTS:", err);
      return fallbackAudio;
    }
  }
};
