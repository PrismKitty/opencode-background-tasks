import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AgentInfo, ModelInfo } from '@opencode/client';

import { formatDuration, headingLabel, subagentModelName, taskTitle } from '#src/labels.ts';

describe('formatDuration', () => {
  it('shows seconds, then minutes and seconds, then hours and minutes', () => {
    assert.equal(formatDuration(42_900), '42s');
    assert.equal(formatDuration(184_000), '3m 04s');
    assert.equal(formatDuration(3_720_000), '1h 02m');
  });
  it('never goes negative when clocks disagree', () => {
    assert.equal(formatDuration(-5), '0s');
  });
});

describe('headingLabel', () => {
  it('counts running tasks, and drops the count once none are running', () => {
    assert.equal(
      headingLabel([{ state: 'running' }, { state: 'running' }, { state: 'succeeded' }]),
      'Background · 2 running',
    );
    assert.equal(headingLabel([{ state: 'failed' }]), 'Background');
  });
});

describe('taskTitle', () => {
  it('names a subagent by its agent and a shell as a shell', () => {
    assert.equal(
      taskTitle({ kind: 'subagent', agent: 'general', label: 'Research UK display' }),
      'General: Research UK display',
    );
    assert.equal(taskTitle({ kind: 'shell', agent: undefined, label: 'npm test' }), 'Shell: npm test');
  });
  it('falls back to the type alone when there is no label, and to Subagent when there is no agent', () => {
    assert.equal(taskTitle({ kind: 'subagent', agent: 'explore', label: undefined }), 'Explore');
    assert.equal(taskTitle({ kind: 'subagent', agent: undefined, label: 'Probe' }), 'Subagent: Probe');
  });
});

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
    assert.equal(
      subagentModelName({ kind: 'subagent', agent: 'explore', model: opus }, agents, models),
      'Claude Opus 5.5',
    );
    assert.equal(
      subagentModelName({ kind: 'subagent', agent: 'explore', model: undefined }, agents, models),
      'Claude Haiku 5',
    );
  });
  it('names nothing for a shell, or for a subagent whose call and agent both leave the model unset', () => {
    assert.equal(subagentModelName({ kind: 'shell', agent: undefined, model: undefined }, agents, models), undefined);
    assert.equal(
      subagentModelName({ kind: 'subagent', agent: 'general', model: undefined }, agents, models),
      undefined,
    );
  });
  it('falls back to the provider and ID when the model is not listed', () => {
    assert.equal(
      subagentModelName({ kind: 'subagent', agent: undefined, model: opus }, agents, undefined),
      'anthropic/claude-opus-5-5',
    );
  });
});
