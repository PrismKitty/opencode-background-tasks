import type { SessionInfo, SessionMessageInfo, ShellInfo } from '@opencode/client';

type AssistantMessage = Extract<SessionMessageInfo, { type: 'assistant' }>;

type ContentPart = AssistantMessage['content'][number];

export const NOW = 1_000_000;

const toolPart = (
  name: string,
  input: Record<string, string | boolean>,
  metadata: Record<string, string | number>,
  completedAt = NOW - 10_000,
): ContentPart => ({
  type: 'tool',
  id: `call_${name}`,
  name,
  state: { status: 'completed', input, content: [{ type: 'text', text: '' }], metadata },
  time: { created: completedAt - 12_000, ran: completedAt - 11_000, completed: completedAt },
});

export const assistantMessage = (...parts: ContentPart[]): AssistantMessage => ({
  id: 'msg_assistant',
  type: 'assistant',
  agent: 'build',
  model: { id: 'model', providerID: 'provider' },
  time: { created: NOW - 20_000 },
  content: parts,
});

export const finishedAssistantMessage = (...parts: ContentPart[]): AssistantMessage => ({
  ...assistantMessage(...parts),
  time: { created: NOW - 20_000, completed: NOW - 5_000 },
});

export const retryingAssistantMessage = (attempt: number): AssistantMessage => ({
  ...assistantMessage(),
  retry: { attempt, at: NOW + 2_000, error: { type: 'unknown', message: 'Overloaded' } },
});

export const runningTool = (name: string, input: Record<string, string>): ContentPart => ({
  type: 'tool',
  id: `call_${name}_running`,
  name,
  state: { status: 'running', input, metadata: {} },
  time: { created: NOW - 2_000, ran: NOW - 1_000 },
});

export const streamingTool = (name: string): ContentPart => ({
  type: 'tool',
  id: `call_${name}_streaming`,
  name,
  state: { status: 'streaming', input: '{"pa' },
  time: { created: NOW - 500 },
});

export const textPart = (): ContentPart => ({ type: 'text', text: 'Found it.' });

export const reasoningPart = (): ContentPart => ({ type: 'reasoning', text: 'Where would that live?' });

export const userMessage = (): SessionMessageInfo =>
  ({ id: 'msg_user', type: 'user', time: { created: NOW - 30_000 }, text: 'hi' }) as SessionMessageInfo;

export const backgroundShell = (shellID: string, command = 'sleep 40'): ContentPart =>
  toolPart('shell', { command, background: true }, { status: 'running', shellID });

export const backgroundSubagent = (
  sessionID: string,
  description = 'Probe something',
  extraInput: Record<string, string> = {},
): ContentPart =>
  toolPart(
    'subagent',
    { agent: 'explore', description, background: true, ...extraInput },
    { status: 'running', sessionID },
  );

export const foregroundShell = (command: string): ContentPart =>
  toolPart('shell', { command }, { status: 'completed', exit: 0 });

export const foregroundSubagent = (sessionID: string): ContentPart =>
  toolPart('subagent', { description: 'Foreground' }, { status: 'completed', sessionID });

export const otherTool = (): ContentPart => toolPart('read', { path: 'x' }, { status: 'running' });

export const finishNotice = (metadata: Record<string, string | number>, createdAt: number): SessionMessageInfo => ({
  id: `msg_notice_${createdAt}`,
  type: 'synthetic',
  metadata,
  time: { created: createdAt },
  text: '',
});

export const shell = (
  status: ShellInfo['status'],
  exit: number | undefined,
  completed: number | undefined,
): ShellInfo => ({
  id: 'sh',
  status,
  command: 'sleep 1',
  cwd: '/',
  shell: 'bash',
  file: '/dev/null',
  ...(exit === undefined ? {} : { exit }),
  metadata: {},
  time: { started: 0, ...(completed === undefined ? {} : { completed }) },
});

export const subagentSession = (outcome: SessionInfo['outcome']): SessionInfo =>
  ({
    id: 'ses',
    projectID: 'project',
    ...(outcome === undefined ? {} : { outcome }),
    time: { created: 0, updated: 9, idle: 7 },
    location: { directory: '/' },
  }) as SessionInfo;
