import type { ShellInfo } from '@opencode/client';
import type { Plugin } from '@opencode/plugin/tui';

import { exitedShell } from '#src/tasks/task-status.ts';

export type ExitedShells = Readonly<Record<string, ShellInfo>>;

export const rememberExitedShells = (context: Plugin.Context): ExitedShells => {
  const [exitedShells, updateExitedShells] = context.storage.memory<Record<string, ShellInfo>>('exited-shells', {
    initial: {},
  });
  const startedShells = new Map<string, ShellInfo>();
  context.data.on('shell.created', (event) => startedShells.set(event.data.info.id, event.data.info));
  context.data.on('shell.exited', (event) => {
    const shell = startedShells.get(event.data.id) ?? context.data.shell.get(event.data.id);
    if (shell === undefined) {
      return;
    }
    updateExitedShells((draft) => {
      draft[event.data.id] = exitedShell(shell, event.data, event.created);
    });
  });
  return exitedShells;
};
