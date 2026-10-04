import type { SessionInfo, SessionMessageInfo, ShellInfo } from '@opencode/client';

type ToolPart = Extract<SessionMessageInfo, { type: 'assistant' }>['content'][number];

export const NOW = 1_000_000;

const toolPart = (
  name: string,
  input: Record<string, string | boolean>,
  metadata: Record<string, string | number>,
  completedAt = NOW - 10_000,
): ToolPart => ({
  type: 'tool',
  id: `call_${name}`,
  name,
  state: { status: 'completed', input, content: [{ type: 'text', text: '' }], metadata },
  time: { created: completedAt - 12_000, ran: completedAt - 11_000, completed: completedAt },
});

export const assistantMessage = (...parts: ToolPart[]): SessionMessageInfo => ({
  id: 'msg_assistant',
  type: 'assistant',
  agent: 'build',
  model: { id: 'model', providerID: 'provider' },
  time: { created: NOW - 20_000 },
  content: parts,
});

export const userMessage = (): SessionMessageInfo =>
  ({ id: 'msg_user', type: 'user', time: { created: NOW - 30_000 }, text: 'hi' }) as SessionMessageInfo;

export const backgroundShell = (shellID: string, command = 'sleep 40'): ToolPart =>
  toolPart('shell', { command, background: true }, { status: 'running', shellID });

export const backgroundSubagent = (sessionID: string, description = 'Probe something'): ToolPart =>
  toolPart('subagent', { agent: 'explore', description, background: true }, { status: 'running', sessionID });

export const foregroundShell = (command: string): ToolPart =>
  toolPart('shell', { command }, { status: 'completed', exit: 0 });

export const foregroundSubagent = (sessionID: string): ToolPart =>
  toolPart('subagent', { description: 'Foreground' }, { status: 'completed', sessionID });

export const otherTool = (): ToolPart => toolPart('read', { path: 'x' }, { status: 'running' });

export const finishReport = (metadata: Record<string, string | number>, createdAt: number): SessionMessageInfo => ({
  id: `msg_report_${createdAt}`,
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
