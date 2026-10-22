import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { backgroundTasks, elapsedMilliseconds, visibleTasks } from '#src/tasks/background-tasks.ts';
import {
  assistantMessage,
  backgroundShell,
  backgroundSubagent,
  finishNotice,
  foregroundShell,
  foregroundSubagent,
  NOW,
  otherTool,
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
    assert.deepEqual(idsOf(backgroundTasks(messages, alwaysRunning)), ['sh_bg', 'ses_child']);
  });
  it('labels a shell by its first command line and a subagent by its description', () => {
    const messages = [assistantMessage(backgroundShell('sh', 'npm test \\\n  --watch'), backgroundSubagent('ses'))];
    const tasks = backgroundTasks(messages, alwaysRunning);
    assert.deepEqual(
      tasks.map((task) => task.label),
      ['npm test \\', 'Probe something'],
    );
  });
  it('keeps the agent and the requested model of a subagent, dropping any variant', () => {
    const messages = [
      assistantMessage(
        backgroundSubagent('ses_model', 'Research', { model: 'openrouter/meta/llama#high' }),
        backgroundSubagent('ses_default'),
        backgroundShell('sh'),
      ),
    ];
    assert.deepEqual(
      backgroundTasks(messages, alwaysRunning).map((task) => [task.agent, task.requestedModel]),
      [
        ['explore', { providerID: 'openrouter', id: 'meta/llama' }],
        ['explore', undefined],
        [undefined, undefined],
      ],
    );
  });
  it('ignores a requested model missing its provider or its model', () => {
    const messages = [
      assistantMessage(
        backgroundSubagent('ses_no_model', 'Research', { model: 'anthropic/' }),
        backgroundSubagent('ses_no_provider', 'Research', { model: '/claude-haiku-5' }),
        backgroundSubagent('ses_bare', 'Research', { model: 'claude-haiku-5' }),
      ),
    ];
    assert.deepEqual(
      backgroundTasks(messages, alwaysRunning).map((task) => task.requestedModel),
      [undefined, undefined, undefined],
    );
  });
  it('starts a task when its tool call began running, not when it moved to the background', () => {
    const [task] = backgroundTasks([assistantMessage(backgroundShell('sh'))], alwaysRunning);
    assert.equal(task?.startedAt, NOW - 21_000);
  });
  it('reads success and failure from the finish notices when no live record is left', () => {
    const messages = [
      assistantMessage(backgroundShell('sh_done'), backgroundShell('sh_failed'), backgroundSubagent('ses_done')),
      finishNotice({ source: 'shell', shellID: 'sh_done', state: 'completed', exit: 0 }, NOW - 1_000),
      finishNotice({ source: 'shell', shellID: 'sh_failed', state: 'completed', exit: 2 }, NOW - 1_000),
      finishNotice({ source: 'subagent', childID: 'ses_done', state: 'completed' }, NOW - 1_000),
    ];
    assert.deepEqual(
      backgroundTasks(messages, noLiveRecord).map((task) => [task.id, task.state]),
      [
        ['sh_done', 'succeeded'],
        ['sh_failed', 'failed'],
        ['ses_done', 'succeeded'],
      ],
    );
  });
  it('drops a task with neither a live record nor a finish notice', () => {
    assert.deepEqual(backgroundTasks([assistantMessage(backgroundShell('sh_lost'))], noLiveRecord), []);
  });
  it('trusts a finish notice over a live record still saying running, and a finished live record over both', () => {
    const messages = [
      assistantMessage(backgroundShell('sh')),
      finishNotice({ source: 'shell', shellID: 'sh', state: 'completed', exit: 0 }, NOW - 1_000),
    ];
    assert.equal(backgroundTasks(messages, alwaysRunning)[0]?.state, 'succeeded');
    const finishedLive = () => ({ state: 'failed' as const, finishedAt: NOW - 500 });
    assert.equal(backgroundTasks(messages, finishedLive)[0]?.state, 'failed');
  });
  it('keeps a task however long ago it finished', () => {
    const messages = [assistantMessage(backgroundShell('sh_old'))];
    const tasks = backgroundTasks(messages, () => ({ state: 'succeeded', finishedAt: 0 }));
    assert.deepEqual(idsOf(tasks), ['sh_old']);
  });
});

describe('visibleTasks', () => {
  it('keeps a running task, and a finished one for ten seconds', () => {
    const finishedAt: Record<string, number> = { sh_recent: NOW - 9_000, sh_old: NOW - 11_000 };
    const messages = [
      assistantMessage(backgroundShell('sh_running'), backgroundShell('sh_recent'), backgroundShell('sh_old')),
    ];
    const tasks = backgroundTasks(messages, (task) => {
      const finished = finishedAt[task.id];
      return finished === undefined ? { state: 'running' } : { state: 'succeeded', finishedAt: finished };
    });
    assert.deepEqual(idsOf(visibleTasks(tasks, NOW)), ['sh_running', 'sh_recent']);
  });
});

describe('elapsedMilliseconds', () => {
  it('counts a running task up to now and stops a finished one at its end', () => {
    const running = {
      kind: 'shell',
      id: 'sh',
      label: 'x',
      agent: undefined,
      requestedModel: undefined,
      startedAt: NOW - 3_000,
      state: 'running',
    } as const;
    assert.equal(elapsedMilliseconds(running, NOW), 3_000);
    assert.equal(elapsedMilliseconds({ ...running, state: 'failed', finishedAt: NOW - 1_000 }, NOW), 2_000);
  });
});
