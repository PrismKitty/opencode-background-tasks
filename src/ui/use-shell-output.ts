import type { LocationRef } from '@opencode/client';
import type { Plugin } from '@opencode/plugin/tui';
import { createSignal, onCleanup } from 'solid-js';

import { appendedOutput, isMissingShell, KEPT_OUTPUT_LENGTH, type ShellOutput } from '#src/shells/shell-output.ts';

export type OutputProblem = 'missing' | 'unreadable';

const CAUGHT_UP_POLL_MILLISECONDS = 1000;

export const useShellOutput = (context: Plugin.Context, shellID: string, location: () => LocationRef | undefined) => {
  const [output, setOutput] = createSignal<ShellOutput>();
  const [problem, setProblem] = createSignal<OutputProblem>();
  let cursor: number | undefined;
  let isClosed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const read = (from: number, limit: number | undefined) =>
    context.client.shell.output({ id: shellID, location: { directory: location()?.directory }, cursor: from, limit });
  const firstKeptCursor = async () => {
    const { data } = await read(Number.MAX_SAFE_INTEGER, undefined);
    return Math.max(0, data.size - KEPT_OUTPUT_LENGTH);
  };
  const readNextPage = async () => {
    const from = cursor ?? (await firstKeptCursor());
    const { data } = await read(from, KEPT_OUTPUT_LENGTH);
    cursor = data.cursor;
    setOutput((previous) => appendedOutput(previous ?? { text: '', isMissingEarlierOutput: from > 0 }, data.output));
    setProblem(undefined);
    return data.cursor < data.size;
  };
  const schedule = (delay: number) => {
    if (!isClosed) {
      timer = setTimeout(poll, delay);
    }
  };
  const poll = () => {
    readNextPage().then(
      (hasMore) => schedule(hasMore ? 0 : CAUGHT_UP_POLL_MILLISECONDS),
      (error: unknown) => {
        setProblem(isMissingShell(error) ? 'missing' : 'unreadable');
        if (!isMissingShell(error)) {
          schedule(CAUGHT_UP_POLL_MILLISECONDS);
        }
      },
    );
  };
  poll();
  onCleanup(() => {
    isClosed = true;
    clearTimeout(timer);
  });
  return { output, problem };
};
