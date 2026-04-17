import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export async function generateQuestion(category: string): Promise<QuizQuestion> {
  const prompt = `Generate a fun and educational multiple-choice trivia question about Singapore in the category: "${category}". 
  The question should be suitable for a family game. 
  Include 4 distinct options and clearly mark the correct answer. 
  Also provide a short, interesting fact as an explanation.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            minItems: 4,
            maxItems: 4,
          },
          correctAnswerIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
        },
        required: ["question", "options", "correctAnswerIndex", "explanation"],
      },
    },
  });

  try {
    const data = JSON.parse(response.text || "{}");
    return data as QuizQuestion;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Could not generate a valid question.");
  }
}
