import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { durationLabel, headingLabel, taskTitle } from '#src/tasks/task-labels.ts';

describe('durationLabel', () => {
  it('shows seconds, then minutes and seconds, then hours and minutes', () => {
    assert.equal(durationLabel(42_900), '42s');
    assert.equal(durationLabel(184_000), '3m 04s');
    assert.equal(durationLabel(3_720_000), '1h 02m');
  });
  it('never goes negative when clocks disagree', () => {
    assert.equal(durationLabel(-5), '0s');
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
