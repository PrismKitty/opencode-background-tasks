import type { ShellInfo } from '@opencode/client';
import type { Plugin } from '@opencode/plugin/tui';

import { TaskStrip } from '#src/sidebar.tsx';

export default {
  id: 'opencode-background-tasks',
  setup(context) {
    // A shell leaves the shell list once it ends, so its end event is the only record of when that was
    const [endedShells, updateEndedShells] = context.storage.memory<Record<string, ShellInfo>>('ended-shells', {
      initial: {},
    });
    context.data.on('session.shell.ended', (event) =>
      updateEndedShells((draft) => {
        draft[event.data.shell.id] = event.data.shell;
      }),
    );
    context.ui.slot({
      append: 'sidebar.content',
      render: (slot) => <TaskStrip context={context} sessionID={slot.sessionID} endedShells={endedShells} />,
    });
  },
} satisfies Plugin.Definition;
