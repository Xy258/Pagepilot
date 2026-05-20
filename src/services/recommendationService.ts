/**
 * Recommendation Service
 * Leverages AI and historical data to provide personalized content suggestions to users.
 */

import { geminiService } from './geminiService';
import { api } from '../lib/api';

export const recommendationService = {
  /**
   * Generates personalized post recommendations using AI analysis of user history.
   * 
   * @param userId The unique ID of the user
   * @param history An array of recently visited posts and categories
   * @returns A promise that resolves to an array of recommended post objects
   */
  async getPersonalizedRecommendations(userId: string, history: any[]) {
    try {
      // Fetch latest published posts as baseline
      const allPosts = await api.posts.list({ status: 'published' });

      // If no history exists (e.g., new user)
      if (!history || history.length === 0) {
        return allPosts.slice(0, 3);
      }

      // Consolidate context for AI consumption
      const historyContext = history.slice(-5).map(h => `${h.title} (${h.category})`).join(', ');
      // Prepare map for lookup
      const postMap = new Map();
      allPosts.forEach((p: any) => postMap.set(p._id || p.id, p));

      const availableContext = allPosts.map((p: any) => `ID: ${p._id || p.id} | Title: ${p.title} | Category: ${p.category}`).join('\n');

      const prompt = `Based on a user's recent browsing history: [${historyContext}], 
      recommend the top 3 most relevant posts from the following list of available posts:
      
      ${availableContext}
      
      Return ONLY a JSON array of the recommended Post IDs.
      Example format: ["id1", "id2", "id3"]`;

      // Use Gemini to analyze affinity and return optimal IDs
      const response = await geminiService.generateContent(prompt);
      const recommendedIds = JSON.parse(response.replace(/```json|```/g, '').trim());

      // Filter and return the full post metadata for the UI
      const recommendedPosts = [];
      for (const id of recommendedIds) {
        const p = postMap.get(id);
        if (p) {
          recommendedPosts.push(p);
        }
      }

      // Final safety fallback
      if (recommendedPosts.length === 0) {
         return allPosts.slice(0, 3);
      }

      return recommendedPosts;
    } catch (error) {
      console.error('Recommendation failed:', error);
      return [];
    }
  }
};
