import type { Plugin } from '@opencode/plugin/tui';

import { rememberExitedShells } from '#src/ui/exited-shells.ts';
import { ShellPanel } from '#src/ui/shell-panel.tsx';
import { TaskList } from '#src/ui/task-list.tsx';

export default {
  id: 'opencode-background-tasks',
  setup(context) {
    const exitedShells = rememberExitedShells(context);
    context.ui.slot({
      append: 'sidebar.content',
      render: (slot) => <TaskList context={context} sessionID={slot.sessionID} exitedShells={exitedShells} />,
    });
    context.ui.slot({
      append: 'session.panel',
      render: (panel) => <ShellPanel context={context} panel={panel} exitedShells={exitedShells} />,
    });
  },
} satisfies Plugin.Definition;
