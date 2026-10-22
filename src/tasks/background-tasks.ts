import type { ModelRef, SessionMessageInfo } from '@opencode/client';

import type { TaskStatus } from '#src/tasks/task-status.ts';
import { textField } from '#src/tasks/text-field.ts';

type TaskKind = 'shell' | 'subagent';

type AssistantPart = Extract<SessionMessageInfo, { type: 'assistant' }>['content'][number];

type ToolState = Extract<AssistantPart, { type: 'tool' }>['state'];

interface TaskDescription {
  kind: TaskKind;
  agent: string | undefined;
  label: string | undefined;
}

interface LaunchedTask extends TaskDescription {
  id: string;
  requestedModel: ModelRef | undefined;
  startedAt: number;
}

export type BackgroundTask = LaunchedTask & TaskStatus;

type LiveStatusLookup = (task: LaunchedTask) => TaskStatus | undefined;

const FINISHED_TASK_LINGER_MILLISECONDS = 10_000;

const LAUNCH_ID_KEYS: Record<TaskKind, string> = { shell: 'shellID', subagent: 'sessionID' };

const FINISH_NOTICE_ID_KEYS: Record<TaskKind, string> = { shell: 'shellID', subagent: 'childID' };

const MODEL_REFERENCE = /^(?<providerID>[^/]+)\/(?<id>[^#]+)(?:#(?<variant>.*))?$/;

const taskKind = (name: unknown): TaskKind | undefined => {
  if (name === 'shell' || name === 'subagent') {
    return name;
  }
  return undefined;
};

const taskLabel = (kind: TaskKind, input: Record<string, unknown>): string | undefined => {
  const description = textField(input, 'description');
  if (description !== undefined || kind === 'subagent') {
    return description;
  }
  return textField(input, 'command')?.split('\n')[0];
};

export const taskDescription = (toolName: string, input: Record<string, unknown>): TaskDescription | undefined => {
  const kind = taskKind(toolName);
  if (kind === undefined) {
    return undefined;
  }
  return { kind, agent: kind === 'subagent' ? textField(input, 'agent') : undefined, label: taskLabel(kind, input) };
};

const requestedModel = (input: Record<string, unknown>): ModelRef | undefined => {
  const reference = textField(input, 'model')?.match(MODEL_REFERENCE)?.groups;
  if (reference?.providerID === undefined || reference.id === undefined) {
    return undefined;
  }
  return { providerID: reference.providerID, id: reference.id };
};

const returnedWhileRunning = (state: ToolState): state is Extract<ToolState, { status: 'completed' }> =>
  state.status === 'completed' && state.metadata?.status === 'running';

const launchedTask = (part: AssistantPart): LaunchedTask | undefined => {
  if (part.type !== 'tool' || !returnedWhileRunning(part.state)) {
    return undefined;
  }
  const description = taskDescription(part.name, part.state.input);
  if (description === undefined) {
    return undefined;
  }
  const id = textField(part.state.metadata ?? {}, LAUNCH_ID_KEYS[description.kind]);
  if (id === undefined) {
    return undefined;
  }
  return {
    ...description,
    id,
    requestedModel: requestedModel(part.state.input),
    startedAt: part.time.ran ?? part.time.created,
  };
};

const launchedTasksIn = (message: SessionMessageInfo): LaunchedTask[] =>
  message.type === 'assistant' ? message.content.flatMap((part) => launchedTask(part) ?? []) : [];

const noticedTaskID = (metadata: Record<string, unknown>): string | undefined => {
  const kind = taskKind(metadata.source);
  return kind === undefined ? undefined : textField(metadata, FINISH_NOTICE_ID_KEYS[kind]);
};

const isSuccessNotice = (metadata: Record<string, unknown>): boolean =>
  metadata.state === 'completed' && (metadata.exit === undefined || metadata.exit === 0);

const finishNoticeEntries = (message: SessionMessageInfo): [string, TaskStatus][] => {
  if (message.type !== 'synthetic' || message.metadata === undefined) {
    return [];
  }
  const id = noticedTaskID(message.metadata);
  if (id === undefined) {
    return [];
  }
  const state = isSuccessNotice(message.metadata) ? 'succeeded' : 'failed';
  return [[id, { state, finishedAt: message.time.created }]];
};

/**
 * OpenCode stamps a finish notice when it reaches the session, which can be well after the task
 * ended, so the notice only stands in for a live record that is gone or still says running
 */
const resolvedStatus = (live: TaskStatus | undefined, notice: TaskStatus | undefined): TaskStatus | undefined => {
  if (live !== undefined && live.state !== 'running') {
    return live;
  }
  return notice ?? live;
};

const isVisible = (task: BackgroundTask, now: number): boolean =>
  task.state === 'running' || now - task.finishedAt < FINISHED_TASK_LINGER_MILLISECONDS;

export const backgroundTasks = (
  messages: readonly SessionMessageInfo[],
  liveStatus: LiveStatusLookup,
): BackgroundTask[] => {
  const notices = new Map(messages.flatMap(finishNoticeEntries));
  return messages.flatMap(launchedTasksIn).flatMap((task) => {
    const status = resolvedStatus(liveStatus(task), notices.get(task.id));
    return status === undefined ? [] : [{ ...task, ...status }];
  });
};

export const visibleTasks = (tasks: readonly BackgroundTask[], now: number): BackgroundTask[] =>
  tasks.filter((task) => isVisible(task, now));

export const elapsedMilliseconds = (task: BackgroundTask, now: number): number =>
  (task.state === 'running' ? now : task.finishedAt) - task.startedAt;
