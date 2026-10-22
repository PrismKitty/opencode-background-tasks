import type { SessionMessageInfo } from '@opencode/client';

type AssistantMessage = Extract<SessionMessageInfo, { type: 'assistant' }>;

type AssistantPart = AssistantMessage['content'][number];

type ToolPart = Extract<AssistantPart, { type: 'tool' }>;

export type SubagentStep =
  | { kind: 'tool'; tool: string; input: Record<string, unknown> }
  | { kind: 'retrying'; attempt: number }
  | { kind: 'thinking' | 'writing' | 'permission' | 'answer' };

interface OpenRequests {
  permission: boolean;
  answer: boolean;
}

const THINKING: SubagentStep = { kind: 'thinking' };

const isConversation = (message: SessionMessageInfo): boolean =>
  message.type === 'assistant' || message.type === 'user' || message.type === 'synthetic';

const isRunningTool = (part: AssistantPart): part is ToolPart =>
  part.type === 'tool' && (part.state.status === 'running' || part.state.status === 'streaming');

const toolStep = (part: ToolPart): SubagentStep => ({
  kind: 'tool',
  tool: part.name,
  input: typeof part.state.input === 'string' ? {} : part.state.input,
});

const assistantStep = (message: AssistantMessage): SubagentStep => {
  const isStreaming = message.time.completed === undefined;
  if (message.retry !== undefined && isStreaming) {
    return { kind: 'retrying', attempt: message.retry.attempt };
  }
  const runningTool = message.content.findLast(isRunningTool);
  if (runningTool !== undefined) {
    return toolStep(runningTool);
  }
  return isStreaming && message.content.at(-1)?.type === 'text' ? { kind: 'writing' } : THINKING;
};

export const isWaitingOnUser = (step: SubagentStep): boolean => step.kind === 'permission' || step.kind === 'answer';

export const currentStep = (
  messages: readonly SessionMessageInfo[],
  openRequests: OpenRequests,
): SubagentStep | undefined => {
  if (openRequests.permission) {
    return { kind: 'permission' };
  }
  if (openRequests.answer) {
    return { kind: 'answer' };
  }
  const latest = messages.findLast(isConversation);
  if (latest === undefined) {
    return undefined;
  }
  return latest.type === 'assistant' ? assistantStep(latest) : THINKING;
};
