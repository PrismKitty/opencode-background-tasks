import type { Plugin } from '@opencode/plugin/tui';
import { createMemo } from 'solid-js';

import { backgroundTasks } from '#src/tasks/background-tasks.ts';
import { shellStatus, subagentStatus } from '#src/tasks/task-status.ts';
import type { ExitedShells } from '#src/ui/exited-shells.ts';

export const useSessionTasks = (context: Plugin.Context, sessionID: () => string, exitedShells: ExitedShells) => {
  const location = () => context.data.session.get(sessionID())?.location;
  const liveShellStatus = (shellID: string) => {
    const shell =
      exitedShells[shellID] ?? context.data.shell.list(location()).find((candidate) => candidate.id === shellID);
    return shell === undefined ? undefined : shellStatus(shell);
  };
  const liveSubagentStatus = (childID: string) => {
    const session = context.data.session.get(childID);
    if (session === undefined) {
      return undefined;
    }
    return subagentStatus(session, context.data.session.status(childID) === 'running');
  };
  const liveStatuses = { shell: liveShellStatus, subagent: liveSubagentStatus };
  void context.data.shell.sync(location());
  const tasks = createMemo(() =>
    backgroundTasks(context.data.session.message.list(sessionID()), (task) => liveStatuses[task.kind](task.id)),
  );
  return { location, tasks };
};
