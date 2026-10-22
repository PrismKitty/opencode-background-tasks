import type { Plugin } from '@opencode/plugin/tui';
import type { PanelInput } from '@opencode/plugin/tui/context';
import { MouseButton, type MouseEvent, type ScrollBoxRenderable } from '@opentui/core';
import { createMemo, Show, type Accessor } from 'solid-js';

import { readableOutput } from '#src/shells/shell-output.ts';
import type { BackgroundTask } from '#src/tasks/background-tasks.ts';
import type { ExitedShells } from '#src/ui/exited-shells.ts';
import { TaskRow } from '#src/ui/task-row.tsx';
import { useClock } from '#src/ui/use-clock.ts';
import { useSessionTasks } from '#src/ui/use-session-tasks.ts';
import { useShellOutput, type OutputProblem } from '#src/ui/use-shell-output.ts';

interface ShellPanelProps {
  context: Plugin.Context;
  panel: PanelInput;
  exitedShells: ExitedShells;
}

interface ShellOutputViewProps extends ShellPanelProps {
  shellID: string;
}

const PANEL_NAME_PREFIX = 'opencode-background-tasks.shell:';

const PROBLEM_MESSAGES: Record<OutputProblem, string> = {
  missing: "This shell's output is no longer available.",
  unreadable: "Couldn't read the output. Trying again.",
};

const panelShellID = (panelName: string): string | undefined =>
  panelName.startsWith(PANEL_NAME_PREFIX) ? panelName.slice(PANEL_NAME_PREFIX.length) : undefined;

export const openShellPanel = (context: Plugin.Context, shellID: string) => {
  context.ui.panel.open(`${PANEL_NAME_PREFIX}${shellID}`);
};

const ShellOutputView = (props: ShellOutputViewProps) => {
  const { context, shellID } = props;
  const theme = context.theme;
  const now = useClock();
  const session = useSessionTasks(context, () => props.panel.sessionID, props.exitedShells);
  const shellOutput = useShellOutput(context, shellID, session.location);
  const task = createMemo(() =>
    session.tasks().find((candidate) => candidate.kind === 'shell' && candidate.id === shellID),
  );
  const command = () => (props.exitedShells[shellID] ?? context.data.shell.get(shellID))?.command;
  const text = createMemo(() => readableOutput(shellOutput.output()?.text ?? ''));
  const keyColor = () => (props.panel.focused ? theme.text.base : theme.text.muted);
  const promptShortcut = () =>
    props.panel.presentation === 'panel' ? context.keymap.shortcuts('pane.focus.left')[0] : undefined;
  let scroll: ScrollBoxRenderable | undefined;

  const placeholder = () => {
    if (shellOutput.output() === undefined) {
      return 'Loading the output.';
    }
    return task()?.state === 'running' ? 'Nothing printed yet.' : 'The shell printed nothing.';
  };

  const closeOnClick = (event: MouseEvent) => {
    if (event.button === MouseButton.LEFT) {
      props.panel.close();
    }
  };

  context.keymap.layer(() => ({
    commands: [
      { bind: 'escape', title: 'Close shell output', group: 'Background tasks', run: props.panel.close },
      { bind: 'up', title: 'Scroll output up', group: 'Background tasks', run: () => scroll?.scrollBy(-1) },
      { bind: 'down', title: 'Scroll output down', group: 'Background tasks', run: () => scroll?.scrollBy(1) },
      {
        bind: 'pageup',
        title: 'Previous output page',
        group: 'Background tasks',
        run: () => scroll?.scrollBy(-(scroll.height - 1)),
      },
      {
        bind: 'pagedown',
        title: 'Next output page',
        group: 'Background tasks',
        run: () => scroll?.scrollBy(scroll.height - 1),
      },
      { bind: 'home', title: 'First kept output', group: 'Background tasks', run: () => scroll?.scrollTo(0) },
      {
        bind: 'end',
        title: 'Follow shell output',
        group: 'Background tasks',
        run: () => scroll?.scrollTo(Number.MAX_SAFE_INTEGER),
      },
    ],
  }));

  return (
    <box flexDirection="column" width="100%" height="100%" paddingTop={1} paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="column" flexShrink={0}>
        <Show when={task()}>
          {(current: Accessor<BackgroundTask>) => (
            <TaskRow context={context} task={current()} now={now()} onOpen={undefined} />
          )}
        </Show>
        <Show when={command() !== undefined && command() !== task()?.label}>
          <text paddingLeft={4} maxHeight={3} wrapMode="word" fg={theme.text.muted}>
            {command()}
          </text>
        </Show>
        <box height={1} border={['bottom']} borderColor={theme.text.muted} />
      </box>
      <Show when={shellOutput.output()?.isMissingEarlierOutput}>
        <text flexShrink={0} fg={theme.text.muted}>
          Earlier output is no longer kept, so this shows the most recent part.
        </text>
      </Show>
      <scrollbox
        ref={(value: ScrollBoxRenderable) => (scroll = value)}
        flexGrow={1}
        stickyScroll
        stickyStart="bottom"
        scrollbarOptions={{ visible: false }}
      >
        <text wrapMode="word" fg={text() === '' ? theme.text.muted : theme.text.base}>
          {text() === '' ? placeholder() : text()}
        </text>
      </scrollbox>
      <Show when={shellOutput.problem()}>
        {(problem: Accessor<OutputProblem>) => (
          <text flexShrink={0} fg={theme.text.feedback.error.base}>
            {PROBLEM_MESSAGES[problem()]}
          </text>
        )}
      </Show>
      <box flexDirection="row" flexWrap="wrap" flexShrink={0} columnGap={2} paddingBottom={1}>
        <text fg={keyColor()} onMouseUp={closeOnClick}>
          esc <span style={{ fg: theme.text.muted }}>close</span>
        </text>
        <text fg={keyColor()}>
          ↑↓ <span style={{ fg: theme.text.muted }}>scroll</span>
        </text>
        <text fg={keyColor()}>
          end <span style={{ fg: theme.text.muted }}>follow</span>
        </text>
        <Show when={promptShortcut()}>
          {(shortcut: Accessor<string>) => (
            <text fg={keyColor()}>
              {shortcut()} <span style={{ fg: theme.text.muted }}>focus prompt</span>
            </text>
          )}
        </Show>
      </box>
    </box>
  );
};

export const ShellPanel = (props: ShellPanelProps) => (
  <Show when={panelShellID(props.panel.name)} keyed>
    {(shellID: string) => (
      <ShellOutputView
        context={props.context}
        panel={props.panel}
        exitedShells={props.exitedShells}
        shellID={shellID}
      />
    )}
  </Show>
);
