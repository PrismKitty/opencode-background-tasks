import type { Plugin } from '@opencode/plugin/tui';
import { createMemo, Index, Show } from 'solid-js';

import { visibleTasks, type BackgroundTask } from '#src/tasks/background-tasks.ts';
import { headingLabel } from '#src/tasks/task-labels.ts';
import type { ExitedShells } from '#src/ui/exited-shells.ts';
import { openShellPanel } from '#src/ui/shell-panel.tsx';
import { SubagentDetails } from '#src/ui/subagent-details.tsx';
import { TaskRow } from '#src/ui/task-row.tsx';
import { useClock } from '#src/ui/use-clock.ts';
import { useSessionTasks } from '#src/ui/use-session-tasks.ts';

interface TaskListProps {
  context: Plugin.Context;
  sessionID: string;
  exitedShells: ExitedShells;
}

export const TaskList = (props: TaskListProps) => {
  const { context } = props;
  const now = useClock();
  const session = useSessionTasks(context, () => props.sessionID, props.exitedShells);
  const tasks = createMemo(() => visibleTasks(session.tasks(), now()));
  const theme = context.theme;

  const openTask = (task: BackgroundTask) => {
    if (task.kind === 'subagent') {
      context.ui.router.navigate({ type: 'session', sessionID: task.id });
      return;
    }
    openShellPanel(context, task.id);
  };

  void context.data.location.agent.sync(session.location());
  void context.data.location.model.sync(session.location());

  return (
    <Show when={tasks().length > 0}>
      <box flexDirection="column">
        <text fg={theme.text.base}>
          <b>{headingLabel(tasks())}</b>
        </text>
        <box height={1} border={['top']} borderColor={theme.text.muted} />
        <Index each={tasks()}>
          {(task) => (
            <TaskRow context={context} task={task()} now={now()} onOpen={() => openTask(task())}>
              <Show when={task().kind === 'subagent'}>
                <SubagentDetails context={context} task={task()} location={session.location()} />
              </Show>
            </TaskRow>
          )}
        </Index>
      </box>
    </Show>
  );
};
