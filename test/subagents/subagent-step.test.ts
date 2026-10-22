import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { currentStep, isWaitingOnUser } from '#src/subagents/subagent-step.ts';
import {
  assistantMessage,
  finishedAssistantMessage,
  finishNotice,
  reasoningPart,
  retryingAssistantMessage,
  runningTool,
  streamingTool,
  textPart,
  userMessage,
} from '#test/fixtures.ts';

const NO_REQUESTS = { permission: false, answer: false };

describe('currentStep', () => {
  it('names the latest running tool along with its input', () => {
    const messages = [
      userMessage(),
      assistantMessage(runningTool('grep', { pattern: 'TODO' }), runningTool('read', { path: 'src/tasks.ts' })),
    ];
    assert.deepEqual(currentStep(messages, NO_REQUESTS), {
      kind: 'tool',
      tool: 'read',
      input: { path: 'src/tasks.ts' },
    });
  });
  it('names a tool whose input is still streaming, with no input yet', () => {
    assert.deepEqual(currentStep([assistantMessage(streamingTool('edit'))], NO_REQUESTS), {
      kind: 'tool',
      tool: 'edit',
      input: {},
    });
  });
  it('is writing while a reply streams, and thinking while it reasons or between replies', () => {
    assert.deepEqual(currentStep([assistantMessage(reasoningPart(), textPart())], NO_REQUESTS), { kind: 'writing' });
    assert.deepEqual(currentStep([assistantMessage(textPart(), reasoningPart())], NO_REQUESTS), { kind: 'thinking' });
    assert.deepEqual(currentStep([finishedAssistantMessage(textPart())], NO_REQUESTS), { kind: 'thinking' });
    assert.deepEqual(currentStep([finishedAssistantMessage(), userMessage()], NO_REQUESTS), { kind: 'thinking' });
  });
  it('reads past a notice such as a model switch to the reply before it', () => {
    const notice = { id: 'msg_switch', type: 'model-switched', time: { created: 1 } } as never;
    assert.deepEqual(currentStep([assistantMessage(textPart()), notice], NO_REQUESTS), { kind: 'writing' });
  });
  it('is thinking once a synthetic message, such as a finished task report, arrives', () => {
    const messages = [assistantMessage(textPart()), finishNotice({ source: 'shell' }, 1)];
    assert.deepEqual(currentStep(messages, NO_REQUESTS), { kind: 'thinking' });
  });
  it('counts the attempts of a retry', () => {
    assert.deepEqual(currentStep([retryingAssistantMessage(2)], NO_REQUESTS), { kind: 'retrying', attempt: 2 });
  });
  it('puts a request waiting on the user ahead of the work it holds up', () => {
    const messages = [assistantMessage(runningTool('shell', { command: 'rm -rf dist' }))];
    assert.deepEqual(currentStep(messages, { permission: true, answer: true }), { kind: 'permission' });
    assert.deepEqual(currentStep(messages, { permission: false, answer: true }), { kind: 'answer' });
  });
  it('names nothing before the session has any messages', () => {
    assert.equal(currentStep([], NO_REQUESTS), undefined);
  });
});

describe('isWaitingOnUser', () => {
  it('holds for a permission or a question, and for nothing the subagent does alone', () => {
    assert.equal(isWaitingOnUser({ kind: 'permission' }), true);
    assert.equal(isWaitingOnUser({ kind: 'answer' }), true);
    assert.equal(isWaitingOnUser({ kind: 'thinking' }), false);
    assert.equal(isWaitingOnUser({ kind: 'tool', tool: 'read', input: {} }), false);
  });
});
