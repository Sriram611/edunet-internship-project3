import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export async function generateFashionDesign(prompt: string, imageBase64?: string, mimeType?: string) {
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
    // Adjust prompt if image is provided to tailor the design to the person
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

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
}

export async function analyzeDesignDetails(prompt: string) {
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

  return response.text;
}

export async function findSimilarProducts(designDescription: string) {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Find affordable online products similar to this fashion design: ${designDescription}. 
    IMPORTANT: Focus EXCLUSIVELY on the Indian market. Search on platforms like Amazon.in, Flipkart, Myntra, Ajio, and popular Indian brands like FabIndia, Westside, or Zudio.
    Provide a list of 3-4 items with their names, approximate prices in Indian Rupees (₹), and direct links to buy them.
    If no direct matches are found, suggest the closest alternatives available in India.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text;
  const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
    title: chunk.web?.title,
    uri: chunk.web?.uri
  })).filter(link => link.uri) || [];

  return { text, links };
}

export async function startFashionChat() {
  const ai = new GoogleGenAI({ apiKey });
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: `You are a world-class fashion design assistant for VogueAI. 
      Your goal is to help users brainstorm and create trendy, high-fashion designs.
      - Suggest specific fabrics, silhouettes, and textures.
      - Keep up with current trends (quiet luxury, techwear, sustainable chic, etc.).
      - When you suggest a design, provide a clear, descriptive prompt that the user can copy and paste into the generator.
      - Be inspiring, professional, and creative.`,
    },
  });
}
