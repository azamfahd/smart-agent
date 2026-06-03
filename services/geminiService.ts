import { AgentRole, AppSettings } from "../types";

export interface AIResponse {
  text: string;
  sources?: { title: string; uri: string }[];
  isThinking?: boolean;
  modelName?: string;
}

export const generateTextResponse = async (
  prompt: string, 
  agentRole: AgentRole,
  systemInstruction: string,
  history: { role: 'user' | 'model', parts: { text: string }[] }[] = [],
  files: { data: string, mimeType: string }[] = [],
  settings?: AppSettings
): Promise<AIResponse> => {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, systemInstruction, history, files, settings })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "خطأ في الاتصال بالخادم الرئيسي.");
    }

    const data = await response.json();
    return {
      text: data.text,
      sources: data.sources,
      isThinking: data.isThinking || false,
      modelName: data.modelName
    };
  } catch (error: any) {
    throw new Error(`${error.message || "عذراً، حدثت مشكلة أثناء معالجة الطلب."}`);
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    if (!response.ok) {
      throw new Error("Server image generation failed.");
    }
    const data = await response.json();
    return data.imageUrl;
  } catch (err) {
    console.warn("Client fallback image generator active:", err);
    const encodedPrompt = encodeURIComponent(prompt);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
  }
};

export const generateVideo = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch("/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    if (!response.ok) {
      throw new Error("Server video generation failed.");
    }
    const data = await response.json();
    if (data.videoUrl) return data.videoUrl;
    throw new Error("No videoUrl in response");
  } catch (err) {
    console.warn("Client fallback video to image active:", err);
    return await generateImage(prompt);
  }
};
