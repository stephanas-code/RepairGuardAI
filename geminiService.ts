
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
    // Technical forensic repair analysis involves complex reasoning.
    // Use 'gemini-3-pro-preview' as specified in guidelines for complex reasoning.
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

    // Access .text property directly as per latest guidelines.
    const text = response.text;
    return JSON.parse(text || "[]");
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return [];
  }
};
