
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Generates project specifications and sub-tasks using the Gemini 3 Flash model.
 * Adheres to strict @google/genai guidelines for world-class performance.
 */
export const getGeminiSuggestions = async (title: string, description: string) => {
  // Use the API key directly from the environment as required by deployment standards
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [{
          text: `You are a professional project manager for EditiQ studio. 
          Analyze the following task and break it into 5 actionable professional sub-tasks. 
          Refine the description to be concise and high-end.
          
          Project Title: ${title}
          Draft Description: ${description}`
        }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subTasks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of exactly 5 actionable studio steps"
            },
            refinedDescription: {
              type: Type.STRING,
              description: "A professional studio-grade project summary"
            }
          },
          required: ["subTasks", "refinedDescription"]
        },
        temperature: 0.7,
      }
    });

    // Directly access the .text property from the GenerateContentResponse object
    const text = response.text;
    if (!text) throw new Error("Empty response from AI engine");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("EditiQ AI Core Error:", error);
    return null;
  }
};
