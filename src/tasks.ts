import type { SessionInfo, SessionMessageInfo, ShellInfo } from '@opencode/client';

type TaskKind = 'shell' | 'subagent';

interface LaunchedTask {
  kind: TaskKind;
  id: string;
  label: string;
  startedAt: number;
}

type TaskStatus = { state: 'running' } | { state: 'succeeded' | 'failed'; finishedAt: number };

export type BackgroundTask = LaunchedTask & TaskStatus;

type LiveStatusLookup = (task: LaunchedTask) => TaskStatus | undefined;

type JsonRecord = Record<string, unknown>;

const FINISHED_TASK_LINGER_MILLISECONDS = 10_000;

const RUNNING: TaskStatus = { state: 'running' };

/**
 * The metadata field holding a task's id, on the tool call that launched it and on the report of its end
 */
const ID_FIELDS: Record<TaskKind, { launch: string; report: string }> = {
  shell: { launch: 'shellID', report: 'shellID' },
  subagent: { launch: 'sessionID', report: 'childID' },
};

const stringField = (record: JsonRecord, key: string): string | undefined => {
  const value = record[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
};

const taskKind = (name: unknown): TaskKind | undefined => {
  if (name === 'shell' || name === 'subagent') {
    return name;
  }
  return undefined;
};

const taskID = (kind: TaskKind, metadata: JsonRecord): string | undefined =>
  stringField(metadata, ID_FIELDS[kind].launch);

const taskLabel = (kind: TaskKind, input: JsonRecord): string => {
  const description = stringField(input, 'description');
  if (description !== undefined) {
    return description;
  }
  if (kind === 'subagent') {
    return 'subagent';
  }
  return stringField(input, 'command')?.split('\n')[0] ?? 'shell';
};

/**
 * A tool call that returned while its work was still running went to the background, whether it
 * asked to up front or was moved there after starting
 */
const launchedTasksIn = (message: SessionMessageInfo): LaunchedTask[] => {
  if (message.type !== 'assistant') {
    return [];
  }
  return message.content.flatMap((part) => {
    if (part.type !== 'tool' || part.state.status !== 'completed') {
      return [];
    }
    const kind = taskKind(part.name);
    const metadata = part.state.metadata ?? {};
    if (kind === undefined || metadata.status !== 'running') {
      return [];
    }
    const id = taskID(kind, metadata);
    if (id === undefined) {
      return [];
    }
    return [{ kind, id, label: taskLabel(kind, part.state.input), startedAt: part.time.ran ?? part.time.created }];
  });
};

const reportedID = (metadata: JsonRecord): string | undefined => {
  const kind = taskKind(metadata.source);
  return kind === undefined ? undefined : stringField(metadata, ID_FIELDS[kind].report);
};

const isReportedSuccess = (metadata: JsonRecord): boolean =>
  metadata.state === 'completed' && (metadata.exit === undefined || metadata.exit === 0);

const finishReportEntries = (message: SessionMessageInfo): [string, TaskStatus][] => {
  if (message.type !== 'synthetic' || message.metadata === undefined) {
    return [];
  }
  const id = reportedID(message.metadata);
  if (id === undefined) {
    return [];
  }
  const state = isReportedSuccess(message.metadata) ? 'succeeded' : 'failed';
  return [[id, { state, finishedAt: message.time.created }]];
};

/**
 * OpenCode posts a synthetic message into the session when a background task ends. It is stamped
 * when it reaches the session, which can be well after the task ended, so it only stands in for a
 * live record that is gone
 */
const finishReports = (messages: readonly SessionMessageInfo[]): Map<string, TaskStatus> =>
  new Map(messages.flatMap(finishReportEntries));

const resolvedStatus = (live: TaskStatus | undefined, report: TaskStatus | undefined): TaskStatus | undefined => {
  if (live !== undefined && live.state !== 'running') {
    return live;
  }
  return report ?? live;
};

const isVisible = (task: BackgroundTask, now: number): boolean =>
  task.state === 'running' || now - task.finishedAt < FINISHED_TASK_LINGER_MILLISECONDS;

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

export const backgroundTasks = (
  messages: readonly SessionMessageInfo[],
  liveStatus: LiveStatusLookup,
  now: number,
): BackgroundTask[] => {
  const reports = finishReports(messages);
  return messages.flatMap(launchedTasksIn).flatMap((task) => {
    const status = resolvedStatus(liveStatus(task), reports.get(task.id));
    if (status === undefined) {
      return [];
    }
    const backgroundTask: BackgroundTask = { ...task, ...status };
    return isVisible(backgroundTask, now) ? [backgroundTask] : [];
  });
};

export const elapsedMilliseconds = (task: BackgroundTask, now: number): number =>
  (task.state === 'running' ? now : task.finishedAt) - task.startedAt;
