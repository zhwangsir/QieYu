
export interface AIConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'qieyu_ai_config';

export const getAIConfig = (): AIConfig => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse AI config", e);
    }
  }
  return {
    baseUrl: 'http://localhost:1234/v1',
    model: 'local-model', // 'gpt-oss-120b' or similar
    temperature: 0.7,
  };
};

export const saveAIConfig = (config: AIConfig) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const streamChatCompletion = async (
  messages: AIMessage[],
  onChunk: (content: string) => void,
  onFinish: () => void,
  onError: (err: string) => void
) => {
  const config = getAIConfig();
  
  // Ensure base URL doesn't end with slash
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  // OpenAI compatible endpoint
  const url = `${baseUrl}/chat/completions`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey || 'lm-studio'}` // LM Studio often accepts any key
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages,
        stream: true,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || -1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    if (!response.body) throw new Error("ReadableStream not supported");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || ""; // Keep the last incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        
        const dataStr = trimmed.replace('data: ', '');
        if (dataStr === '[DONE]') {
          onFinish();
          return;
        }

        try {
          const json = JSON.parse(dataStr);
          const content = json.choices?.[0]?.delta?.content || "";
          if (content) {
            onChunk(content);
          }
        } catch (e) {
          // Ignore parse errors for partial chunks
        }
      }
    }
    
    // Process remaining buffer if any (rare for SSE)
    onFinish();

  } catch (err: any) {
    console.error("AI Service Error:", err);
    onError(err.message || "请求 AI 服务失败");
  }
};
