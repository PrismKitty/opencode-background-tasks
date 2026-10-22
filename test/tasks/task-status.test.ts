import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { exitedShell, shellStatus, subagentStatus } from '#src/tasks/task-status.ts';
import { NOW, shell, subagentSession } from '#test/fixtures.ts';

describe('exitedShell', () => {
  it('stamps the exit onto the record OpenCode drops, keeping the command and start', () => {
    const exited = exitedShell(shell('running', undefined, undefined), { status: 'exited', exit: 2 }, NOW);
    assert.deepEqual([exited.command, exited.time], ['sleep 1', { started: 0, completed: NOW }]);
    assert.deepEqual(shellStatus(exited), { state: 'failed', finishedAt: NOW });
  });
});

describe('shellStatus', () => {
  it('maps the shell record onto running, succeeded and failed', () => {
    assert.deepEqual(shellStatus(shell('running', undefined, undefined)), { state: 'running' });
    assert.deepEqual(shellStatus(shell('exited', 0, 5)), { state: 'succeeded', finishedAt: 5 });
    assert.deepEqual(shellStatus(shell('exited', 1, 5)), { state: 'failed', finishedAt: 5 });
    assert.deepEqual(shellStatus(shell('killed', undefined, 5)), { state: 'failed', finishedAt: 5 });
    assert.deepEqual(shellStatus(shell('timeout', undefined, 5)), { state: 'failed', finishedAt: 5 });
  });
  it('defers to the finish notice when a finished shell has no end time', () => {
    assert.equal(shellStatus(shell('exited', 0, undefined)), undefined);
  });
});

describe('subagentStatus', () => {
  it('maps the child session onto running, succeeded and failed, finishing when it went idle', () => {
    assert.deepEqual(subagentStatus(subagentSession(undefined), true), { state: 'running' });
    assert.deepEqual(subagentStatus(subagentSession('succeeded'), false), { state: 'succeeded', finishedAt: 7 });
    assert.deepEqual(subagentStatus(subagentSession('interrupted'), false), { state: 'failed', finishedAt: 7 });
  });
  it('defers to the finish notice when an idle child has no outcome', () => {
    assert.equal(subagentStatus(subagentSession(undefined), false), undefined);
  });
});
