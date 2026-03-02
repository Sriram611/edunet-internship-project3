import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, imageBase64, mimeType } = req.body;
      const ai = new GoogleGenAI({ apiKey });
      const parts: any[] = [
        {
          text: `Fashion design: ${prompt}. Professional studio photography, high fashion, elegant lighting, minimal background.`,
        },
      ];

      if (imageBase64 && mimeType) {
        parts.push({
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        });
        parts[0].text = `Based on the person in this image, create a fashion design: ${prompt}. The design should complement their features and body type. Professional studio photography, high fashion, elegant lighting.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: parts,
        },
        config: {
          imageConfig: {
            aspectRatio: "3:4",
          },
        },
      });

      let imageUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!imageUrl) throw new Error("No image generated");
      res.json({ imageUrl });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const { prompt } = req.body;
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `As a high-fashion consultant, analyze this design concept: "${prompt}". 
        Provide:
        1. Recommended Fabrics (e.g., silk organza, technical mesh).
        2. Tailoring Details (e.g., asymmetrical draping, laser-cut edges).
        3. Color Palette (3-4 specific shades with poetic names).
        4. Occasion (where this would be worn).
        Format as a structured JSON-like response but in plain text with clear headings.`,
      });
      res.json({ details: response.text });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/search", async (req, res) => {
    try {
      const { prompt } = req.body;
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find affordable online products similar to this fashion design: ${prompt}. 
        IMPORTANT: Focus EXCLUSIVELY on the Indian market. Search on platforms like Amazon.in, Flipkart, Myntra, Ajio, and popular Indian brands like FabIndia, Westside, or Zudio.
        Provide a list of 3-4 items with their names, approximate prices in Indian Rupees (₹), and direct links to buy them.
        If no direct matches are found, suggest the closest alternatives available in India.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
        title: chunk.web?.title,
        uri: chunk.web?.uri
      })).filter(link => link.uri) || [];

      res.json({ text: response.text, links });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
