import type { AgentInfo, ModelInfo, ModelRef } from '@opencode/client';

import type { BackgroundTask } from '#src/tasks.ts';

const capitalised = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

const taskType = (task: Pick<BackgroundTask, 'kind' | 'agent'>): string => {
  if (task.kind === 'shell') {
    return 'Shell';
  }
  return task.agent === undefined ? 'Subagent' : capitalised(task.agent);
};

export const taskTitle = (task: Pick<BackgroundTask, 'kind' | 'agent' | 'label'>): string =>
  task.label === undefined ? taskType(task) : `${taskType(task)}: ${task.label}`;

const modelName = (model: ModelRef, models: readonly ModelInfo[] | undefined): string =>
  models?.find((candidate) => candidate.providerID === model.providerID && candidate.modelID === model.id)?.name ??
  `${model.providerID}/${model.id}`;

const configuredModel = (agent: string | undefined, agents: readonly AgentInfo[] | undefined): ModelRef | undefined =>
  agents?.find((candidate) => candidate.id === agent || candidate.name === agent)?.model;

/**
 * The model the subagent call asked for, or else the one its agent is configured with
 */
export const subagentModelName = (
  task: Pick<BackgroundTask, 'kind' | 'agent' | 'model'>,
  agents: readonly AgentInfo[] | undefined,
  models: readonly ModelInfo[] | undefined,
): string | undefined => {
  if (task.kind !== 'subagent') {
    return undefined;
  }
  const model = task.model ?? configuredModel(task.agent, agents);
  return model === undefined ? undefined : modelName(model, models);
};

export const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
};

export const headingLabel = (tasks: readonly Pick<BackgroundTask, 'state'>[]): string => {
  const runningCount = tasks.filter((task) => task.state === 'running').length;
  return runningCount === 0 ? 'Background' : `Background · ${runningCount} running`;
};
