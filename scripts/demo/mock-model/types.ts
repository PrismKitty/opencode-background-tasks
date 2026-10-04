export interface ToolCall {
  id: string;
  name: string;
  arguments: object;
}

export interface Reply {
  delaySeconds: number;
  text: string | undefined;
  toolCalls: ToolCall[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | { type: string; text?: string }[] | null;
}

export interface ChatRequest {
  messages: ChatMessage[];
  tools?: unknown[]; // absent on OpenCode's title request
}
