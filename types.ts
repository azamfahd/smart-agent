
export enum AgentRole {
  GENERAL = 'GENERAL',
  ACADEMIC = 'ACADEMIC',
  CREATIVE = 'CREATIVE',
  CODER = 'CODER',
  ANALYST = 'ANALYST',
  VIDEO = 'VIDEO'
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'video';
  imageUrl?: string;
  videoUrl?: string;
  attachments?: string[];
  sources?: { title: string; uri: string }[];
  isThinkingResult?: boolean;
  modelName?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  agentId: AgentRole;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentConfig {
  id: AgentRole;
  name: string;
  icon: string;
  description: string;
  systemInstruction: string;
  color: string;
}

export type ModelProvider = 'gemini' | 'openai' | 'deepseek' | 'anthropic' | 'groq' | 'pollinations';

export interface ProviderConfig {
  apiKey: string;
  userApiKey?: string;
  baseUrl?: string;
  enabled: boolean;
  selectedModel: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AppSettings {
  providers: {
    [key in ModelProvider]: ProviderConfig;
  };
  activeProvider: ModelProvider;
  system: {
    language: 'ar' | 'en';
    soundEnabled: boolean;
  };
}
