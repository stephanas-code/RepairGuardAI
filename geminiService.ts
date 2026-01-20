
import { GoogleGenAI, Type } from "@google/genai";
import { AISuggestion, DeviceCategory } from "./types";

// Initialize the GoogleGenAI client with the required named parameter.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeFault = async (
  category: DeviceCategory,
  brand: string,
  model: string,
  fault: string,
  initialCondition: string
): Promise<AISuggestion[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Perform a comprehensive forensic repair analysis for a ${category} (${brand} ${model}).
      Reported Fault: "${fault}"
      Initial Physical Condition: "${initialCondition}"
      
      Provide 3 technical diagnostic suggestions, prioritizing the most likely solution first.
      
      For each suggestion, provide:
      - 'solution': Technical title of the fix.
      - 'description': Brief summary of the issue.
      - 'accuracy': Confidence score (0-100).
      - 'precision': Effectiveness score (0-100).
      - 'riskLevel': 'Low', 'Medium', or 'High'.
      - 'steps': An ordered array of specific technical steps to perform the repair.
      - 'externalResources': An array of 1-2 relevant external links (YouTube video search query link or iFixit/Manufacturer guide URL) to assist the technician.
      
      Ensure links are valid search query URLs if specific direct links aren't certain (e.g., https://www.youtube.com/results?search_query=...).`,
      config: {
        systemInstruction: `You are RepairGuardAI, a world-class forensic repair assistant. Output detailed, professional technical steps.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              solution: { type: Type.STRING },
              description: { type: Type.STRING },
              accuracy: { type: Type.NUMBER },
              precision: { type: Type.NUMBER },
              riskLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
              steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              externalResources: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    url: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['Video', 'Article'] }
                  }
                }
              }
            },
            required: ["solution", "description", "accuracy", "precision", "riskLevel", "steps", "externalResources"]
          }
        }
      }
    });

    const text = response.text;
    return JSON.parse(text || "[]");
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return [];
  }
};

/**
 * Uses Gemini 2.5 Flash to extract IMEI, Serial Numbers, or Model identifiers from device photos.
 */
export const extractDeviceMetadata = async (base64Image: string): Promise<{ imei?: string; serial?: string; modelInfo?: string }> => {
  try {
    // Standardize data: URL if present
    const data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: data
          }
        },
        {
          text: "Extract any hardware identifiers from this device photo. Look for IMEI numbers (15 digits), Serial Numbers (S/N), or Model Numbers. Focus on stickers, etched text, or screen info if visible. Return the result as a valid JSON object with keys 'imei', 'serial', and 'modelInfo'. Do not use markdown formatting."
        }
      ]
    });

    let text = response.text || "{}";
    // Strip markdown if present
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(text);
  } catch (error) {
    console.error("Metadata extraction failed:", error);
    return {};
  }
};
