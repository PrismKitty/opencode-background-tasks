import type { ChatMessage, ChatRequest, Reply, ToolCall } from './types.ts';

const SUBAGENT_PROMPT = 'Summarise README.md in one sentence.';
const README_SUMMARY = 'my-project is a small shop front that sells houseplants.';

/**
 * OpenCode tells the agent a background task ended with a user message such as
 * <shell id="..." state="completed" command="./build.sh">
 */
const FINISH_REPLIES: { notice: string; text: string }[] = [
  { notice: '<subagent ', text: `The README summary is back: ${README_SUMMARY}` },
  { notice: 'command="./build.sh"', text: 'The build passed.' },
  { notice: 'command="./test.sh"', text: 'The tests failed, with 2 failing tests. Want me to look into them?' },
];

const say = (text: string, delaySeconds = 0.6): Reply => ({ delaySeconds, text, toolCalls: [] });

const callTools = (toolCalls: ToolCall[], delaySeconds = 0.8): Reply => ({ delaySeconds, text: undefined, toolCalls });

const backgroundShell = (id: string, command: string): ToolCall => ({
  id,
  name: 'shell',
  arguments: { command, background: true },
});

const backgroundSubagent = (id: string, description: string, prompt: string): ToolCall => ({
  id,
  name: 'subagent',
  arguments: { agent: 'explore', description, prompt, background: true },
});

const messageText = (message: ChatMessage | undefined): string => {
  if (message === undefined || message.content === null) {
    return '';
  }
  if (typeof message.content === 'string') {
    return message.content;
  }
  return message.content.map((part) => part.text ?? '').join('');
};

const isTitleRequest = (request: ChatRequest): boolean => request.tools === undefined;

const isSubagent = (request: ChatRequest): boolean => {
  const firstUserMessage = request.messages.find((message) => message.role === 'user');
  return messageText(firstUserMessage).endsWith(SUBAGENT_PROMPT);
};

const hasReplied = (request: ChatRequest): boolean => request.messages.some((message) => message.role === 'assistant');

const lastRole = (request: ChatRequest): ChatMessage['role'] | undefined => request.messages.at(-1)?.role;

const finishNoticeReply = (notice: string): Reply => {
  const finishReply = FINISH_REPLIES.find((candidate) => notice.includes(candidate.notice));
  if (finishReply === undefined) {
    console.error(`mock-model: no scripted reply to ${notice.slice(0, 80)}`);
    return say('Noted.');
  }
  return say(finishReply.text);
};

const subagentReply = (request: ChatRequest): Reply => {
  if (lastRole(request) === 'user') {
    return callTools([{ id: 'read-readme', name: 'read', arguments: { path: 'README.md' } }], 2.5);
  }
  return say(README_SUMMARY, 4);
};

const agentReply = (request: ChatRequest): Reply => {
  if (!hasReplied(request)) {
    return callTools([
      backgroundShell('build', './build.sh'),
      backgroundShell('test', './test.sh'),
      backgroundSubagent('summarise', 'Summarise the README', SUBAGENT_PROMPT),
    ]);
  }
  if (lastRole(request) === 'tool') {
    return say("All three are running in the background. I'll leave them to it.");
  }
  return finishNoticeReply(messageText(request.messages.at(-1)));
};

/**
 * Picks the next reply from the conversation so far, since the main session, its subagent and
 * OpenCode's title request all arrive interleaved
 */
export const replyTo = (request: ChatRequest): Reply => {
  if (isTitleRequest(request)) {
    return say('Background build, tests and README', 0);
  }
  if (isSubagent(request)) {
    return subagentReply(request);
  }
  return agentReply(request);
};
