import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AgentInfo, ModelInfo } from '@opencode/client';

import { costLabel, pathInProject, stepLabel, subagentModelName, usageLabel } from '#src/subagents/subagent-labels.ts';

const unchangedPath = (path: string): string => path;

const toolLabel = (tool: string, input: Record<string, string>): string =>
  stepLabel({ kind: 'tool', tool, input }, unchangedPath);

describe('subagentModelName', () => {
  const models = [
    { providerID: 'anthropic', modelID: 'claude-opus-5-5', name: 'Claude Opus 5.5' },
    { providerID: 'anthropic', modelID: 'claude-haiku-5', name: 'Claude Haiku 5' },
  ] as ModelInfo[];
  const agents = [
    { id: 'explore', name: 'explore', model: { providerID: 'anthropic', id: 'claude-haiku-5' } },
  ] as AgentInfo[];
  const opus = { providerID: 'anthropic', id: 'claude-opus-5-5' };
  it('names the model the call asked for over the one its agent is configured with', () => {
    assert.equal(subagentModelName({ agent: 'explore', requestedModel: opus }, agents, models), 'Claude Opus 5.5');
    assert.equal(subagentModelName({ agent: 'explore', requestedModel: undefined }, agents, models), 'Claude Haiku 5');
  });
  it('names nothing when the call and the agent both leave the model unset', () => {
    assert.equal(subagentModelName({ agent: 'general', requestedModel: undefined }, agents, models), undefined);
  });
  it('falls back to the provider and ID when the model is not listed', () => {
    assert.equal(
      subagentModelName({ agent: undefined, requestedModel: opus }, agents, undefined),
      'anthropic/claude-opus-5-5',
    );
  });
});

describe('stepLabel', () => {
  it('names a tool by what it works on', () => {
    assert.equal(toolLabel('read', { path: 'src/tasks.ts' }), 'Read: src/tasks.ts');
    assert.equal(toolLabel('grep', { pattern: 'TODO', path: 'src' }), 'Grep: TODO');
    assert.equal(toolLabel('webfetch', { url: 'https://opencode.ai' }), 'Web fetch: https://opencode.ai');
    assert.equal(toolLabel('skill', { id: 'tdd' }), 'Skill: tdd');
  });
  it('names a tool with nothing to work on by its name alone', () => {
    assert.equal(toolLabel('todowrite', {}), 'Todos');
    assert.equal(toolLabel('github_search', {}), 'Github_search');
  });
  it('names a shell or subagent call the way the sidebar names the task', () => {
    assert.equal(toolLabel('shell', { command: 'pnpm test\npnpm build' }), 'Shell: pnpm test');
    assert.equal(
      toolLabel('subagent', { agent: 'explore', description: 'Find the config' }),
      'Explore: Find the config',
    );
  });
  it('formats a path, and only a path', () => {
    const shouted = (path: string): string => path.toUpperCase();
    assert.equal(stepLabel({ kind: 'tool', tool: 'read', input: { path: 'a.ts' } }, shouted), 'Read: A.TS');
    assert.equal(stepLabel({ kind: 'tool', tool: 'glob', input: { pattern: '*.ts' } }, shouted), 'Glob: *.ts');
  });
  it('names the steps between tools', () => {
    assert.equal(stepLabel({ kind: 'thinking' }, unchangedPath), 'Thinking');
    assert.equal(stepLabel({ kind: 'writing' }, unchangedPath), 'Writing');
    assert.equal(stepLabel({ kind: 'retrying', attempt: 3 }, unchangedPath), 'Retrying, attempt 3');
    assert.equal(stepLabel({ kind: 'permission' }, unchangedPath), 'Waiting for permission');
    assert.equal(stepLabel({ kind: 'answer' }, unchangedPath), 'Waiting for an answer');
  });
});

describe('costLabel', () => {
  it('shows dollars and cents, a floor under a cent, and nothing for free', () => {
    assert.equal(costLabel(1.234), '$1.23');
    assert.equal(costLabel(0.004), '<$0.01');
    assert.equal(costLabel(0), undefined);
  });
});

describe('usageLabel', () => {
  it('joins the model and the cost, leaving out whichever is missing', () => {
    assert.equal(usageLabel('Claude Haiku 5', 0.12), 'Claude Haiku 5 · $0.12');
    assert.equal(usageLabel('Claude Haiku 5', 0), 'Claude Haiku 5');
    assert.equal(usageLabel(undefined, 0.12), '$0.12');
    assert.equal(usageLabel(undefined, 0), undefined);
  });
});

describe('pathInProject', () => {
  it('makes a path inside the directory relative to it', () => {
    assert.equal(pathInProject('/work/app/src/a.ts', '/work/app'), 'src/a.ts');
    assert.equal(pathInProject('/work/app/src/a.ts', '/work/app/'), 'src/a.ts');
  });
  it('leaves a path outside the directory, or a sibling sharing its prefix, to the caller', () => {
    assert.equal(pathInProject('/etc/hosts', '/work/app'), undefined);
    assert.equal(pathInProject('/work/apple/a.ts', '/work/app'), undefined);
    assert.equal(pathInProject('/work/app/a.ts', undefined), undefined);
  });
});
