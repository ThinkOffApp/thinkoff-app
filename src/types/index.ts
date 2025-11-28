export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  provider?: string;
  model?: string;
  isComparison?: boolean;
  comparisonResponses?: ComparisonResponse[];
  evaluation?: EvaluationResult;
  streamingJudgeText?: string;
  imageUrl?: string; // Preview URL for display
  imageBase64?: string; // Base64 data for API
  imageMimeType?: string; // MIME type (e.g., 'image/jpeg')
}

export interface ComparisonResponse {
  provider: string;
  model: string;
  response: string;
  timestamp: string;
  responseTimeSeconds?: number;
  rank?: number;
  score?: number;
}

export interface EvaluationResult {
  winner: string;
  reasoning: string;
  rankings: RankedResponse[];
}

export interface RankedResponse {
  provider: string;
  model: string;
  rank: number;
  score: number;
  reasoning: string;
}

export interface Provider {
  id: string;
  name: string;
  icon: string;
  color: string;
  models: string[];
}

export interface SessionInfo {
  userId: string;
  credits: number;
  tier: string;
}

export const PROVIDERS: Provider[] = [
  { id: 'openai', name: 'OpenAI', icon: '🤖', color: '#10a37f', models: ['gpt-5.1', 'gpt-4o', 'gpt-4o-mini', 'o3', 'o1'] },
  { id: 'anthropic', name: 'Claude', icon: '🧠', color: '#d97706', models: ['claude-sonnet-4-5-20250929', 'claude-opus-4-5-20251101', 'claude-sonnet-4-20250514'] },
  { id: 'google', name: 'Gemini', icon: '🔮', color: '#4285f4', models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'] },
  { id: 'grok', name: 'Grok', icon: '🚀', color: '#1d9bf0', models: ['grok-3', 'grok-3-fast', 'grok-3-mini'] },
  { id: 'mistral', name: 'Mistral', icon: '🌬️', color: '#f97316', models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'] },
  { id: 'meta', name: 'Meta', icon: '🦙', color: '#0866ff', models: ['llama-4-maverick-17b-128e-instruct', 'llama-3.3-70b-instruct'] },
  { id: 'perplexity', name: 'Perplexity', icon: '🔍', color: '#20b2aa', models: ['sonar-pro', 'sonar', 'sonar-reasoning-pro'] },
  { id: 'kimi', name: 'Kimi', icon: '🌙', color: '#6366f1', models: ['moonshot-v1-8k', 'moonshot-v1-32k'] },
  { id: 'thinkoff', name: '@ThinkOff', icon: '💬', color: '#FF00FF', models: ['thinkoff-customer-service'] },
];
