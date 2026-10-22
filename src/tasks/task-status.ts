import type { SessionInfo, ShellInfo } from '@opencode/client';

export type TaskStatus = { state: 'running' } | { state: 'succeeded' | 'failed'; finishedAt: number };

const RUNNING: TaskStatus = { state: 'running' };

export const exitedShell = (
  shell: ShellInfo,
  exit: Pick<ShellInfo, 'status' | 'exit'>,
  exitedAt: number,
): ShellInfo => ({
  ...shell,
  status: exit.status,
  exit: exit.exit,
  time: { ...shell.time, completed: exitedAt },
});

export const shellStatus = (shell: ShellInfo): TaskStatus | undefined => {
  if (shell.status === 'running') {
    return RUNNING;
  }
  if (shell.time.completed === undefined) {
    return undefined;
  }
  return {
    state: shell.status === 'exited' && shell.exit === 0 ? 'succeeded' : 'failed',
    finishedAt: shell.time.completed,
  };
};

export const subagentStatus = (session: SessionInfo, isRunning: boolean): TaskStatus | undefined => {
  if (isRunning) {
    return RUNNING;
  }
  if (session.outcome === undefined) {
    return undefined;
  }
  return {
    state: session.outcome === 'succeeded' ? 'succeeded' : 'failed',
    finishedAt: session.time.idle ?? session.time.updated,
  };
};
