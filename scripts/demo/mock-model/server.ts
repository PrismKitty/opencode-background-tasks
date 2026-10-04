import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { json } from 'node:stream/consumers';
import { setTimeout as sleep } from 'node:timers/promises';
import { replyTo } from './scene.ts';
import type { ChatRequest, Reply, ToolCall } from './types.ts';

const SECONDS_PER_WORD = 0.04;

const pause = (seconds: number): Promise<void> => sleep(seconds * 1000);

const sendChunk = (
  response: ServerResponse,
  delta: object,
  finishReason: 'stop' | 'tool_calls' | null = null,
): void => {
  const choice = { index: 0, delta, finish_reason: finishReason };
  const chunk = { id: 'mock', object: 'chat.completion.chunk', created: 0, model: 'mock', choices: [choice] };
  response.write(`data: ${JSON.stringify(chunk)}\n\n`);
};

const toolCallDelta = (toolCall: ToolCall, index: number): object => {
  const callFunction = { name: toolCall.name, arguments: JSON.stringify(toolCall.arguments) };
  return { tool_calls: [{ index, id: toolCall.id, type: 'function', function: callFunction }] };
};

const streamText = async (response: ServerResponse, text: string): Promise<void> => {
  for (const word of text.split(/(?<= )/)) {
    sendChunk(response, { content: word });
    await pause(SECONDS_PER_WORD);
  }
};

const streamReply = async (response: ServerResponse, reply: Reply): Promise<void> => {
  response.writeHead(200, { 'content-type': 'text/event-stream' });
  sendChunk(response, { role: 'assistant' });
  await pause(reply.delaySeconds);
  if (reply.text !== undefined) {
    await streamText(response, reply.text);
  }
  reply.toolCalls.forEach((toolCall, index) => sendChunk(response, toolCallDelta(toolCall, index)));
  sendChunk(response, {}, reply.toolCalls.length > 0 ? 'tool_calls' : 'stop');
  response.end('data: [DONE]\n\n');
};

const server = createServer(async (request, response) => {
  await streamReply(response, replyTo((await json(request)) as ChatRequest));
});
server.listen(0, '127.0.0.1', () => {
  console.log((server.address() as AddressInfo).port);
});
