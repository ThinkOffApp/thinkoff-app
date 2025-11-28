// Always use production backend - no local backend for web app
const BASE_URL = 'https://thinkoff-concierge-594749896867.us-central1.run.app';

export interface StreamCallbacks {
  onToken: (provider: string, token: string) => void;
  onResponse: (provider: string, model: string, response: string) => void;
  onJudgeToken?: (token: string) => void;
  onEvaluation: (evaluation: { winner: string; reasoning: string; rankings: any[] }) => void;
  onStatus?: (message: string, phase: string) => void;
  onError: (error: string) => void;
  onComplete: () => void;
}

export async function initSession(userId: string, authToken: string): Promise<{ credits: number; tier: string }> {
  const response = await fetch(`${BASE_URL}/api/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'X-Platform': 'web',
    },
    body: JSON.stringify({ userId, platform: 'web' }),
  });

  if (!response.ok) {
    throw new Error('Failed to initialize session');
  }

  const data = await response.json();
  return {
    credits: data.credits?.currentBalance || 0,
    tier: data.tier || 'free',
  };
}

export interface ImageData {
  base64: string;
  mimeType: string;
}

export async function streamComparison(
  userId: string,
  authToken: string,
  message: string,
  providers: string[],
  callbacks: StreamCallbacks,
  enableJudge: boolean = true,
  judgeProvider?: string,
  image?: ImageData
): Promise<void> {
  try {
    console.log(`[Full Mode] Connecting to ${BASE_URL}/api/query/compare-stream`);
    const response = await fetch(`${BASE_URL}/api/query/compare-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Platform': 'web',
      },
      body: JSON.stringify({
        userId,
        message,
        providers,
        enableJudge,
        judgeProvider,
        // Backend expects imageBase64 as raw base64 string (it adds data URL prefix itself)
        ...(image && {
          imageBase64: image.base64,
        }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Full Mode] API Error:', response.status, error);
      callbacks.onError(`API Error ${response.status}: ${error}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('No response body');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const responses: Record<string, { model: string; text: string }> = {};

    // Parse standard SSE format: event: xxx\ndata: {...}\n\n
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on double newline to get complete events
      const events = buffer.split('\n\n');
      buffer = events.pop() || ''; // Keep incomplete event in buffer

      for (const eventBlock of events) {
        if (!eventBlock.trim()) continue;

        const lines = eventBlock.split('\n');
        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6);
          }
        }

        if (!eventData) continue;

        try {
          const data = JSON.parse(eventData);
          console.log(`[Full Mode] Event: ${eventType}`, data);

          switch (eventType) {
            case 'token':
              if (data.provider && data.content) {
                callbacks.onToken(data.provider, data.content);
                if (!responses[data.provider]) {
                  responses[data.provider] = { model: '', text: '' };
                }
                responses[data.provider].text += data.content;
              }
              break;

            case 'response':
              if (data.provider) {
                responses[data.provider] = { model: data.model || '', text: data.response || '' };
                callbacks.onResponse(data.provider, data.model || '', data.response || '');
              }
              break;

            case 'evaluation':
            case 'judge':
              callbacks.onEvaluation({
                winner: data.winner,
                reasoning: data.reasoning,
                rankings: data.rankings || [],
              });
              break;

            case 'judge_token':
              callbacks.onJudgeToken?.(data.content || data.token);
              break;

            case 'classification':
              // Query classification - can be used for status
              callbacks.onStatus?.(`Query: ${data.queryType || 'general'}`, 'classifying');
              break;

            case 'complete':
              callbacks.onComplete();
              return;

            case 'error':
              callbacks.onError(data.message || data.error || 'Unknown error');
              return;
          }
        } catch (e) {
          // Skip invalid JSON
          console.warn('[Full Mode] Failed to parse SSE data:', eventData);
        }
      }
    }

    callbacks.onComplete();
  } catch (error) {
    console.error('[Full Mode] Network error:', error);
    callbacks.onError(error instanceof Error ? error.message : 'Network error');
  }
}

export async function getCredits(userId: string, authToken: string): Promise<number> {
  const response = await fetch(`${BASE_URL}/api/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    return 0;
  }

  const data = await response.json();
  return data.credits?.currentBalance || 0;
}

export async function updateSyncPreference(
  userId: string,
  authToken: string,
  syncEnabled: boolean
): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Platform': 'web',
      },
      body: JSON.stringify({
        userId,
        settings: {
          syncEnabled,
        },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to update sync preference:', error);
    return false;
  }
}

export async function getSyncPreference(
  userId: string,
  authToken: string
): Promise<boolean | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Platform': 'web',
      },
      body: JSON.stringify({ userId, platform: 'web' }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    // Return null if syncEnabled has never been set (user hasn't been asked)
    return data.syncEnabled ?? null;
  } catch (error) {
    console.error('Failed to get sync preference:', error);
    return null;
  }
}

// ============ @ThinkOff Chat API ============

export interface ChatMessage {
  id: string;
  fromUserId: string;
  fromNickname: string;
  toUserId: string;
  toNickname: string;
  content: string;
  timestamp: string;
  read: boolean;
  type?: 'direct' | 'support' | 'support_reply';
  model?: string;
}

export interface NicknameInfo {
  nickname: string;
  userId: string;
}

// Check if a nickname is available
export async function checkNickname(nickname: string): Promise<{ available: boolean; message?: string }> {
  try {
    const response = await fetch(`${BASE_URL}/api/nickname/check/${encodeURIComponent(nickname)}`);
    const data = await response.json();
    return { available: data.available, message: data.message };
  } catch (error) {
    console.error('Failed to check nickname:', error);
    return { available: false, message: 'Failed to check nickname' };
  }
}

// Register a nickname for the current user
export async function registerNickname(
  userId: string,
  authToken: string,
  nickname: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${BASE_URL}/api/nickname`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Platform': 'web',
      },
      body: JSON.stringify({ userId, nickname }),
    });

    const data = await response.json();
    return { success: response.ok, message: data.message || data.error };
  } catch (error) {
    console.error('Failed to register nickname:', error);
    return { success: false, message: 'Failed to register nickname' };
  }
}

// Get current user's nickname
export async function getNickname(
  userId: string,
  authToken: string
): Promise<string | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/nickname?userId=${encodeURIComponent(userId)}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Platform': 'web',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.nickname || null;
  } catch (error) {
    console.error('Failed to get nickname:', error);
    return null;
  }
}

// Send a message to @thinkoff support
export async function sendThinkOffMessage(
  userId: string,
  authToken: string,
  message: string,
  type: string = 'feedback'
): Promise<{ success: boolean; messageId?: string; aiResponse?: string; model?: string; error?: string }> {
  try {
    const response = await fetch(`${BASE_URL}/api/messages/thinkoff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Platform': 'web',
      },
      body: JSON.stringify({
        userId,
        message,
        type,
        metadata: { platform: 'web' },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send message' };
    }

    return {
      success: true,
      messageId: data.messageId,
      aiResponse: data.aiResponse,
      model: data.model,
    };
  } catch (error) {
    console.error('Failed to send ThinkOff message:', error);
    return { success: false, error: 'Network error' };
  }
}

// Send a direct message to another user
export async function sendDirectMessage(
  userId: string,
  authToken: string,
  toNickname: string,
  content: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(`${BASE_URL}/api/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Platform': 'web',
      },
      body: JSON.stringify({
        fromUserId: userId,
        toNickname,
        content,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send message' };
    }

    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('Failed to send direct message:', error);
    return { success: false, error: 'Network error' };
  }
}

// Get messages for the current user
export async function getMessages(
  userId: string,
  authToken: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  try {
    const response = await fetch(`${BASE_URL}/api/messages/list?userId=${encodeURIComponent(userId)}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Platform': 'web',
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Failed to get messages:', error);
    return [];
  }
}
