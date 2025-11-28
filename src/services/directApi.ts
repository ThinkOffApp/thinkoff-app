// Direct API calls to providers (Local Mode)

export interface ApiKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  grok?: string;
  mistral?: string;
}

export interface DirectCallResult {
  provider: string;
  model: string;
  response: string;
  responseTime: number;
}

const PROVIDER_CONFIGS: Record<string, { url: string; model: string }> = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
  },
  google: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    model: 'gemini-2.5-flash',
  },
  grok: {
    url: 'https://api.x.ai/v1/chat/completions',
    model: 'grok-3',
  },
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-large-latest',
  },
};

export async function callProvider(
  provider: string,
  message: string,
  apiKey: string
): Promise<DirectCallResult> {
  console.log(`[Local Mode] Calling provider: ${provider}`);
  const config = PROVIDER_CONFIGS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const startTime = Date.now();
  let response: string;

  try {
    if (provider === 'anthropic') {
      response = await callAnthropic(message, apiKey, config.model);
    } else if (provider === 'google') {
      response = await callGoogle(message, apiKey, config.model);
    } else {
      // OpenAI-compatible API (OpenAI, Grok, Mistral)
      response = await callOpenAICompatible(config.url, message, apiKey, config.model);
    }
  } catch (error) {
    throw new Error(`${provider} error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    provider,
    model: config.model,
    response,
    responseTime: (Date.now() - startTime) / 1000,
  };
}

async function callOpenAICompatible(
  url: string,
  message: string,
  apiKey: string,
  model: string
): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: message }],
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callAnthropic(
  message: string,
  apiKey: string,
  model: string
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: message }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

async function callGoogle(
  message: string,
  apiKey: string,
  model: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: message }] }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Streaming call to Mistral for judge evaluation
export async function streamMistralJudge(
  prompt: string,
  apiKey: string,
  onToken: (token: string) => void
): Promise<string> {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullResponse = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      if (line === 'data: [DONE]') continue;

      try {
        const data = JSON.parse(line.slice(6));
        const token = data.choices?.[0]?.delta?.content;
        if (token) {
          fullResponse += token;
          onToken(token);
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }

  return fullResponse;
}

// Local judge using one of the user's API keys with streaming
export async function runLocalJudge(
  responses: DirectCallResult[],
  userQuery: string,
  apiKeys: ApiKeys,
  onJudgeToken?: (token: string) => void,
  preferredJudge?: string
): Promise<{ winner: string; reasoning: string; rankings: { provider: string; rank: number; score: number }[] }> {
  // Pick the judge: use preferred if available, otherwise fallback to Mistral -> OpenAI -> Any
  let judgeProvider = preferredJudge;

  if (!judgeProvider || !apiKeys[judgeProvider as keyof ApiKeys]) {
    judgeProvider = apiKeys.mistral ? 'mistral' : apiKeys.openai ? 'openai' : Object.keys(apiKeys).find(k => apiKeys[k as keyof ApiKeys]);
  }

  if (!judgeProvider) {
    throw new Error('No API key available for judging');
  }

  const prompt = `You are an impartial AI judge evaluating ${responses.length} AI responses to a user query.

USER QUERY: ${userQuery}

RESPONSES TO EVALUATE:
${responses.map(r => `=== ${r.provider.toUpperCase()} (${r.model}) ===
${r.response}
`).join('\n')}

EVALUATION CRITERIA:
1. Accuracy and correctness
2. Completeness and depth
3. Clarity and presentation
4. Relevance to the query

INSTRUCTIONS:
- Evaluate each response on a scale of 1-10
- Give DIFFERENT scores to each provider (no ties!)
- The winner gets the highest score
- Be specific in your reasoning, mentioning each provider by name

You MUST respond with this EXACT JSON format:
{
  "winner": "${responses[0].provider}",
  "reasoning": "**${responses[0].provider.toUpperCase()}** scored highest because... **${responses[1]?.provider.toUpperCase() || 'Other'}** was good but... (use markdown formatting)",
  "rankings": [
    {"provider": "${responses[0].provider}", "rank": 1, "score": 8.5},
    {"provider": "${responses[1]?.provider || 'other'}", "rank": 2, "score": 7.2}${responses.length > 2 ? `,
    {"provider": "${responses[2]?.provider || 'other'}", "rank": 3, "score": 6.8}` : ''}${responses.length > 3 ? `,
    {"provider": "${responses[3]?.provider || 'other'}", "rank": 4, "score": 6.0}` : ''}
  ]
}

RESPOND WITH JSON ONLY, NO OTHER TEXT:`;

  let judgeResponse: string;

  // Use streaming for Mistral if available
  if (judgeProvider === 'mistral' && onJudgeToken) {
    judgeResponse = await streamMistralJudge(prompt, apiKeys.mistral!, onJudgeToken);
  } else {
    const result = await callProvider(judgeProvider, prompt, apiKeys[judgeProvider as keyof ApiKeys]!);
    judgeResponse = result.response;
  }

  try {
    // Extract JSON from response
    const jsonMatch = judgeResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and fix rankings
    if (!parsed.rankings || !Array.isArray(parsed.rankings)) {
      throw new Error('No rankings array');
    }

    // Ensure all providers have rankings
    const rankedProviders = new Set(parsed.rankings.map((r: any) => r.provider?.toLowerCase()));
    for (const resp of responses) {
      if (!rankedProviders.has(resp.provider.toLowerCase())) {
        parsed.rankings.push({
          provider: resp.provider,
          rank: parsed.rankings.length + 1,
          score: 5.0,
        });
      }
    }

    // Sort by rank and ensure unique scores
    parsed.rankings.sort((a: any, b: any) => (a.rank || 99) - (b.rank || 99));

    return parsed;
  } catch (e) {
    console.error('Judge parse error:', e, 'Response:', judgeResponse);
    // Fallback - just rank by response time
    return {
      winner: responses[0].provider,
      reasoning: 'Could not parse judge response. Ranked by response time.',
      rankings: responses
        .sort((a, b) => a.responseTime - b.responseTime)
        .map((r, i) => ({ provider: r.provider, rank: i + 1, score: 9 - i * 0.5 })),
    };
  }
}
