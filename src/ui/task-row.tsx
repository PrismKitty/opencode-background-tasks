import type { Plugin } from '@opencode/plugin/tui';
import { MouseButton, type MouseEvent, type RGBA } from '@opentui/core';
import type { JSX } from '@opentui/solid';
import { createSignal, Show } from 'solid-js';

import { elapsedMilliseconds, type BackgroundTask } from '#src/tasks/background-tasks.ts';
import { durationLabel, taskTitle } from '#src/tasks/task-labels.ts';

interface TaskRowProps {
  context: Plugin.Context;
  task: BackgroundTask;
  now: number;
  onOpen: (() => void) | undefined;
  children?: JSX.Element;
}

interface DetailLineProps {
  color: RGBA;
  text: string;
}

const STATE_MARKS: Record<BackgroundTask['state'], { symbol: string; feedback: 'warning' | 'success' | 'error' }> = {
  running: { symbol: '•', feedback: 'warning' },
  succeeded: { symbol: '✓', feedback: 'success' },
  failed: { symbol: '✗', feedback: 'error' },
};

export const DetailLine = (props: DetailLineProps) => (
  <box paddingLeft={4}>
    <text wrapMode="none" truncate fg={props.color}>
      {props.text}
    </text>
  </box>
);

export const TaskRow = (props: TaskRowProps) => {
  const theme = props.context.theme;
  const [isHovered, setHovered] = createSignal(false);
  const mark = () => STATE_MARKS[props.task.state];
  const labelColor = () => (props.task.state === 'running' || isHovered() ? theme.text.base : theme.text.muted);

  const open = (event: MouseEvent) => {
    if (event.button !== MouseButton.LEFT || props.onOpen === undefined) {
      return;
    }
    if (props.context.renderer.getSelection()?.getSelectedText()) {
      return;
    }
    props.onOpen();
  };

  return (
    <box
      flexDirection="column"
      backgroundColor={isHovered() ? theme.background.raised.high : undefined}
      onMouseOver={() => setHovered(props.onOpen !== undefined)}
      onMouseOut={() => setHovered(false)}
      onMouseUp={open}
    >
      <box flexDirection="row" gap={1}>
        <text flexShrink={0} fg={theme.text.feedback[mark().feedback].base}>{`[${mark().symbol}]`}</text>
        <text flexGrow={1} flexShrink={1} wrapMode="word" fg={labelColor()}>
          {taskTitle(props.task)}
        </text>
        <text flexShrink={0} fg={theme.text.muted}>
          {durationLabel(elapsedMilliseconds(props.task, props.now))}
        </text>
        <Show when={props.onOpen !== undefined}>
          <text flexShrink={0} fg={isHovered() ? theme.text.base : theme.text.muted}>
            ›
          </text>
        </Show>
      </box>
      {props.children}
    </box>
  );
};
