
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
      contents: `Perform a forensic repair analysis for a ${category} (${brand} ${model}).
      Reported Fault: "${fault}"
      Initial Physical Condition: "${initialCondition}"
      
      Provide 3 technical diagnostic suggestions.
      For each, define:
      - 'solution': Technical title
      - 'description': Forensic diagnostic steps
      - 'accuracy': Confidence that this is the root cause (0-100)
      - 'precision': Effectiveness of the proposed fix (0-100)
      - 'riskLevel': Risk of further damage (Low, Medium, High)`,
      config: {
        systemInstruction: `You are RepairGuardAI, a regulated, compliance-focused digital repair, forensic logging, and cybersecurity assistance system. All outputs must be structured, neutral, factual, and timestamp-aware.`,
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
              riskLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] }
            },
            required: ["solution", "description", "accuracy", "precision", "riskLevel"]
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
          text: "Extract any hardware identifiers from this device photo. Look for IMEI numbers (15 digits), Serial Numbers (S/N), or Model Numbers. Focus on stickers, etched text, or screen info if visible. Return only valid JSON."
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            imei: { type: Type.STRING, description: "15-digit International Mobile Equipment Identity" },
            serial: { type: Type.STRING, description: "Manufacturer serial number" },
            modelInfo: { type: Type.STRING, description: "Specific model variant or name detected" }
          }
        }
      }
    });

    const text = response.text;
    return JSON.parse(text || "{}");
  } catch (error) {
    console.error("Metadata extraction failed:", error);
    return {};
  }
};
