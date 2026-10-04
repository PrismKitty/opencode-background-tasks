import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { backgroundTasks, elapsedMilliseconds, shellStatus, subagentStatus } from '#src/tasks.ts';
import {
  assistantMessage,
  backgroundShell,
  backgroundSubagent,
  finishReport,
  foregroundShell,
  foregroundSubagent,
  NOW,
  otherTool,
  shell,
  subagentSession,
  userMessage,
} from '#test/fixtures.ts';

const alwaysRunning = () => ({ state: 'running' as const });

const noLiveRecord = () => undefined;

const idsOf = (tasks: readonly { id: string }[]): string[] => tasks.map((task) => task.id);

describe('backgroundTasks', () => {
  it('counts only shell and subagent calls that returned while still running', () => {
    const messages = [
      assistantMessage(
        backgroundShell('sh_bg'),
        foregroundShell('ls'),
        backgroundSubagent('ses_child'),
        foregroundSubagent('ses_fg'),
        otherTool(),
      ),
      userMessage(),
    ];
    assert.deepEqual(idsOf(backgroundTasks(messages, alwaysRunning, NOW)), ['sh_bg', 'ses_child']);
  });
  it('labels a shell by its first command line and a subagent by its description', () => {
    const messages = [assistantMessage(backgroundShell('sh', 'npm test \\\n  --watch'), backgroundSubagent('ses'))];
    const tasks = backgroundTasks(messages, alwaysRunning, NOW);
    assert.deepEqual(
      tasks.map((task) => task.label),
      ['npm test \\', 'Probe something'],
    );
  });
  it('starts a task when its tool call began running, not when it moved to the background', () => {
    const [task] = backgroundTasks([assistantMessage(backgroundShell('sh'))], alwaysRunning, NOW);
    assert.equal(task?.startedAt, NOW - 21_000);
  });
  it('reads success and failure from the finish reports when no live record is left', () => {
    const messages = [
      assistantMessage(backgroundShell('sh_done'), backgroundShell('sh_failed'), backgroundSubagent('ses_done')),
      finishReport({ source: 'shell', shellID: 'sh_done', state: 'completed', exit: 0 }, NOW - 1_000),
      finishReport({ source: 'shell', shellID: 'sh_failed', state: 'completed', exit: 2 }, NOW - 1_000),
      finishReport({ source: 'subagent', childID: 'ses_done', state: 'completed' }, NOW - 1_000),
    ];
    assert.deepEqual(
      backgroundTasks(messages, noLiveRecord, NOW).map((task) => [task.id, task.state]),
      [
        ['sh_done', 'succeeded'],
        ['sh_failed', 'failed'],
        ['ses_done', 'succeeded'],
      ],
    );
  });
  it('drops a task with neither a live record nor a report', () => {
    assert.deepEqual(backgroundTasks([assistantMessage(backgroundShell('sh_lost'))], noLiveRecord, NOW), []);
  });
  it('trusts a report over a live record still saying running, and a finished live record over both', () => {
    const messages = [
      assistantMessage(backgroundShell('sh')),
      finishReport({ source: 'shell', shellID: 'sh', state: 'completed', exit: 0 }, NOW - 1_000),
    ];
    assert.equal(backgroundTasks(messages, alwaysRunning, NOW)[0]?.state, 'succeeded');
    const finishedLive = () => ({ state: 'failed' as const, finishedAt: NOW - 500 });
    assert.equal(backgroundTasks(messages, finishedLive, NOW)[0]?.state, 'failed');
  });
  it('keeps a finished task for ten seconds', () => {
    const finishedAt: Record<string, number> = { sh_recent: NOW - 9_000, sh_old: NOW - 11_000 };
    const messages = [assistantMessage(backgroundShell('sh_recent'), backgroundShell('sh_old'))];
    const tasks = backgroundTasks(
      messages,
      (task) => ({ state: 'succeeded', finishedAt: finishedAt[task.id] ?? 0 }),
      NOW,
    );
    assert.deepEqual(idsOf(tasks), ['sh_recent']);
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
  it('defers to the report when a finished shell has no end time', () => {
    assert.equal(shellStatus(shell('exited', 0, undefined)), undefined);
  });
});

describe('subagentStatus', () => {
  it('maps the child session onto running, succeeded and failed, finishing when it went idle', () => {
    assert.deepEqual(subagentStatus(subagentSession(undefined), true), { state: 'running' });
    assert.deepEqual(subagentStatus(subagentSession('succeeded'), false), { state: 'succeeded', finishedAt: 7 });
    assert.deepEqual(subagentStatus(subagentSession('interrupted'), false), { state: 'failed', finishedAt: 7 });
  });
  it('defers to the report when an idle child has no outcome', () => {
    assert.equal(subagentStatus(subagentSession(undefined), false), undefined);
  });
});

describe('elapsedMilliseconds', () => {
  it('counts a running task up to now and stops a finished one at its end', () => {
    const running = { kind: 'shell', id: 'sh', label: 'x', startedAt: NOW - 3_000, state: 'running' } as const;
    assert.equal(elapsedMilliseconds(running, NOW), 3_000);
    assert.equal(elapsedMilliseconds({ ...running, state: 'failed', finishedAt: NOW - 1_000 }, NOW), 2_000);
  });
});
