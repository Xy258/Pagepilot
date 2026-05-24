import { api } from '../lib/api';

export const seedService = {
  async seedDemoContent(userId: string) {
    try {
      // Seed Posts
      const posts = [
        {
          title: "The Future of AI in Web Design",
          slug: "future-ai-web-design",
          content: "Artificial intelligence is shifting from being a tool to a collaborator. In Page Pilot, we leverage the power of Gemini to bridge the gap between imagination and implementation. Traditional grid systems are giving way to fluid, AI-generated layouts that adapt to content intent rather than just screen size.",
          excerpt: "How AI is transforming the designer's role from pixel-pusher to experience-architect.",
          category: "Tech",
          status: "published",
          authorId: userId,
          views: 450,
          secondsSpent: 12000
        },
        {
          title: "Crafting Minimalism: A Guide",
          slug: "crafting-minimalism",
          content: "Minimalism isn't the absence of things, it's the perfect amount of something. In the digital forest of Page Pilot, we prioritize breatheable space and deliberate typography. Every element must serve a purpose, or it must be removed.",
          excerpt: "Why less is often much more than simply 'nothing'.",
          category: "Design",
          status: "published",
          authorId: userId,
          views: 230,
          secondsSpent: 8500
        },
        {
          title: "India's Tech Renaissance",
          slug: "india-tech-renaissance",
          content: "From Bangalore to Hyderabad, India is witnessing a massive surge in artisanal SaaS development. Page Pilot represents this spirit of building global tools with local craftsmanship.",
          excerpt: "Exploring the rise of Indian software excellence on the global stage.",
          category: "Market",
          status: "published",
          authorId: userId,
          views: 890,
          secondsSpent: 25000
        }
      ];

      for (const p of posts) {
        await api.posts.create(p);
      }

      // Seed Products
      const products = [
        {
          name: "Sandalwood Incense Set",
          description: "Premium hand-rolled incense for a meditative sculpting environment.",
          price: 499,
          stock: 50,
          category: "Personal Care",
          status: "active",
          images: ["https://images.unsplash.com/photo-1628157790387-a25e24391674?w=500&auto=format&fit=crop"]
        },
        {
          name: "Artisan Ceramic Mug",
          description: "Minimalist mug crafted from high-fire stoneware.",
          price: 850,
          stock: 25,
          category: "Kitchen",
          status: "active",
          images: ["https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500&auto=format&fit=crop"]
        }
      ];

      for (const p of products) {
        await api.products.create(p);
      }

      // Seed Notifications
      await api.notifications.create({
        userId: userId,
        title: "Demo Data Synchronized",
        message: "We've populated your workshop with sample sculptures and products to showcase the engine's power.",
        type: "system",
        read: false
      });

      return true;
    } catch (e) {
      console.error("Seeding failed:", e);
      return false;
    }
  }
};
