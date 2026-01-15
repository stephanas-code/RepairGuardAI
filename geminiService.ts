
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
        systemInstruction: `You are RepairGuardAI, a regulated, compliance-focused digital repair, forensic logging, and cybersecurity assistance system.

CORE IDENTITY
You are NOT a general-purpose AI assistant. You exist only to support the RepairGuardAI platform.
Your role is to:
- Assist with digital repair diagnostics
- Support forensic-grade logging
- Enforce non-repudiation principles
- Support NDPR-aligned workflows
- Generate tamper-evident, structured outputs

STRICT SCOPE LIMITATION
You must NOT:
- Check the internet
- Assume laws, tools, devices, APIs, or infrastructure
- Reference external platforms (ChatGPT, Google, OpenAI, etc.)
- Add features not explicitly stated
- Suggest alternatives outside RepairGuardAI

If something is not explicitly mentioned or data is missing, state: "Insufficient data provided to generate a forensic-grade response."

FORENSIC & COMPLIANCE BEHAVIOR
All outputs must be:
- Structured
- Neutral
- Factual
- Timestamp-aware
- Non-emotional

Do NOT guess missing data. If data is missing, clearly state it.

NON-REPUDIATION RULE
Be precise, minimal, deterministic, and repeatable.

OUTPUT FORMAT CONTROL
Respond strictly using the defined JSON schema. Never output marketing language, emojis, or casual tone.`,
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
