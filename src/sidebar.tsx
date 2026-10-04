import type { ShellInfo } from '@opencode/client';
import type { Plugin } from '@opencode/plugin/tui';
import { createMemo, createSignal, Index, onCleanup, Show } from 'solid-js';

import { formatDuration, headingLabel } from '#src/labels.ts';
import { backgroundTasks, elapsedMilliseconds, shellStatus, subagentStatus, type BackgroundTask } from '#src/tasks.ts';

interface TaskStripProps {
  context: Plugin.Context;
  sessionID: string;
  endedShells: Readonly<Record<string, ShellInfo>>;
}

interface TaskRowProps {
  context: Plugin.Context;
  task: BackgroundTask;
  now: number;
}

const STATE_MARKS: Record<BackgroundTask['state'], { symbol: string; feedback: 'warning' | 'success' | 'error' }> = {
  running: { symbol: '•', feedback: 'warning' },
  succeeded: { symbol: '✓', feedback: 'success' },
  failed: { symbol: '✗', feedback: 'error' },
};

const TaskRow = (props: TaskRowProps) => {
  const theme = props.context.theme.text;
  const mark = () => STATE_MARKS[props.task.state];
  const labelColor = () => (props.task.state === 'running' ? theme.base : theme.muted);

  return (
    <box flexDirection="row" gap={1}>
      <text flexShrink={0} fg={theme.feedback[mark().feedback].base}>{`[${mark().symbol}]`}</text>
      <text flexGrow={1} flexShrink={1} wrapMode="word" fg={labelColor()}>
        {props.task.label}
      </text>
      <text flexShrink={0} fg={theme.muted}>
        {formatDuration(elapsedMilliseconds(props.task, props.now))}
      </text>
    </box>
  );
};

export const TaskStrip = (props: TaskStripProps) => {
  const { context } = props;
  const [now, setNow] = createSignal(Date.now());
  const location = () => context.data.session.get(props.sessionID)?.location;
  const theme = context.theme.text;

  const liveShellStatus = (shellID: string) => {
    const shell =
      props.endedShells[shellID] ?? context.data.shell.list(location()).find((candidate) => candidate.id === shellID);
    if (shell === undefined) {
      return undefined;
    }
    return shellStatus(shell);
  };

  const liveSubagentStatus = (sessionID: string) => {
    const session = context.data.session.get(sessionID);
    if (session === undefined) {
      return undefined;
    }
    return subagentStatus(session, context.data.session.status(sessionID) === 'running');
  };

  const liveStatuses = { shell: liveShellStatus, subagent: liveSubagentStatus };

  const syncShellsOnOwnStart = (event: { data: { sessionID: string } }) => {
    if (event.data.sessionID === props.sessionID) {
      void context.data.shell.sync(location());
    }
  };

  const tasks = createMemo(() => {
    const messages = context.data.session.message.list(props.sessionID);
    return backgroundTasks(messages, (task) => liveStatuses[task.kind](task.id), now());
  });

  const ticker = setInterval(() => setNow(Date.now()), 1000);
  onCleanup(() => clearInterval(ticker));

  void context.data.shell.sync(location());
  onCleanup(context.data.on('session.shell.started', syncShellsOnOwnStart));

  return (
    <Show when={tasks().length > 0}>
      <box flexDirection="column">
        <text fg={theme.base}>
          <b>{headingLabel(tasks())}</b>
        </text>
        <box height={1} border={['top']} borderColor={theme.muted} />
        <Index each={tasks()}>{(task) => <TaskRow context={context} task={task()} now={now()} />}</Index>
      </box>
    </Show>
  );
};
