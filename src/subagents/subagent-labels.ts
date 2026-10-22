import type { AgentInfo, ModelInfo, ModelRef } from '@opencode/client';

import type { SubagentStep } from '#src/subagents/subagent-step.ts';
import { taskDescription, type BackgroundTask } from '#src/tasks/background-tasks.ts';
import { capitalised, taskTitle } from '#src/tasks/task-labels.ts';
import { textField } from '#src/tasks/text-field.ts';

type PathFormat = (path: string) => string;

const STEP_LABELS: Record<Exclude<SubagentStep['kind'], 'tool' | 'retrying'>, string> = {
  thinking: 'Thinking',
  writing: 'Writing',
  permission: 'Waiting for permission',
  answer: 'Waiting for an answer',
};

const READABLE_TOOL_NAMES: Record<string, string> = {
  webfetch: 'Web fetch',
  websearch: 'Web search',
  todowrite: 'Todos',
};

const SUBJECT_FIELDS_BY_PRIORITY = ['pattern', 'query', 'url', 'path', 'description', 'id'];

const modelName = (model: ModelRef, models: readonly ModelInfo[] | undefined): string =>
  models?.find((candidate) => candidate.providerID === model.providerID && candidate.modelID === model.id)?.name ??
  `${model.providerID}/${model.id}`;

const configuredModel = (agent: string | undefined, agents: readonly AgentInfo[] | undefined): ModelRef | undefined =>
  agents?.find((candidate) => candidate.id === agent || candidate.name === agent)?.model;

export const subagentModelName = (
  task: Pick<BackgroundTask, 'agent' | 'requestedModel'>,
  agents: readonly AgentInfo[] | undefined,
  models: readonly ModelInfo[] | undefined,
): string | undefined => {
  const model = task.requestedModel ?? configuredModel(task.agent, agents);
  return model === undefined ? undefined : modelName(model, models);
};

export const costLabel = (dollars: number): string | undefined => {
  if (dollars <= 0) {
    return undefined;
  }
  return dollars < 0.01 ? '<$0.01' : `$${dollars.toFixed(2)}`;
};

export const usageLabel = (model: string | undefined, dollars: number): string | undefined => {
  const parts = [model, costLabel(dollars)].filter((part) => part !== undefined);
  return parts.length === 0 ? undefined : parts.join(' · ');
};

export const pathInProject = (path: string, projectDirectory: string | undefined): string | undefined => {
  if (projectDirectory === undefined) {
    return undefined;
  }
  const prefix = projectDirectory.endsWith('/') ? projectDirectory : `${projectDirectory}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : undefined;
};

const toolSubject = (input: Record<string, unknown>, formatPath: PathFormat): string | undefined => {
  const field = SUBJECT_FIELDS_BY_PRIORITY.find((candidate) => textField(input, candidate) !== undefined);
  const value = field === undefined ? undefined : textField(input, field);
  if (value === undefined) {
    return undefined;
  }
  return field === 'path' ? formatPath(value) : value;
};

const toolStepLabel = (tool: string, input: Record<string, unknown>, formatPath: PathFormat): string => {
  const launchedTask = taskDescription(tool, input);
  if (launchedTask !== undefined) {
    return taskTitle(launchedTask);
  }
  const name = READABLE_TOOL_NAMES[tool] ?? capitalised(tool);
  const subject = toolSubject(input, formatPath);
  return subject === undefined ? name : `${name}: ${subject}`;
};

export const stepLabel = (step: SubagentStep, formatPath: PathFormat): string => {
  if (step.kind === 'tool') {
    return toolStepLabel(step.tool, step.input, formatPath);
  }
  if (step.kind === 'retrying') {
    return `Retrying, attempt ${step.attempt}`;
  }
  return STEP_LABELS[step.kind];
};
