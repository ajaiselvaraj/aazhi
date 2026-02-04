
import { GoogleGenAI } from "@google/genai";

/**
 * Smart Help Service
 * Supports standard fast response and deep thinking mode
 */
export const getSmartHelp = async (query: string, lang: string, mode: 'fast' | 'thinking' = 'fast') => {
  /* Initialized GoogleGenAI correctly using process.env.API_KEY without fallback */
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use gemini-flash-lite-latest for fast responses, gemini-3-pro-preview for complex reasoning
  const model = mode === 'fast' ? 'gemini-flash-lite-latest' : 'gemini-3-pro-preview';
  
  const config: any = {
    systemInstruction: "You are an official digital kiosk assistant for the Indian government's Smart City initiative. Provide accurate guidance on utility procedures (Electricity, Water, Gas, Municipal). Be concise and helpful.",
    temperature: mode === 'fast' ? 0.7 : 1,
  };
  
  if (mode === 'thinking') {
    // Max budget for gemini-3-pro-preview is 32768
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Citizen Query: "${query}"
      Language: ${lang}
      Task: Guide the citizen on required documents, procedures, or status tracking.`,
      config,
    });
    // Property access is correct; .text() is not a method.
    return response.text;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "I'm experiencing higher than usual load. Please try again or visit the physical help desk.";
  }
};

/**
 * Image Generation Service
 * Uses gemini-3-pro-image-preview for high quality visual generation
 */
export const generateCitizenImage = async (prompt: string, aspectRatio: string) => {
  /* Initialized GoogleGenAI correctly using process.env.API_KEY directly */
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { 
          aspectRatio: aspectRatio as any, 
          imageSize: "1K" 
        }
      },
    });

    // Iterating through parts as image part might not be first.
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};
