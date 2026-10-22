import type { LocationRef } from '@opencode/client';
import type { Plugin } from '@opencode/plugin/tui';
import { createEffect, Show, type Accessor } from 'solid-js';

import { pathInProject, stepLabel, subagentModelName, usageLabel } from '#src/subagents/subagent-labels.ts';
import { currentStep, isWaitingOnUser, type SubagentStep } from '#src/subagents/subagent-step.ts';
import type { BackgroundTask } from '#src/tasks/background-tasks.ts';
import { DetailLine } from '#src/ui/task-row.tsx';

interface SubagentDetailsProps {
  context: Plugin.Context;
  task: BackgroundTask;
  location: LocationRef | undefined;
}

export const SubagentDetails = (props: SubagentDetailsProps) => {
  const { context } = props;
  const { data, theme } = context;
  const openRequests = () => ({
    permission: (data.session.permission.list(props.task.id)?.length ?? 0) > 0,
    answer: (data.session.form.list(props.task.id)?.length ?? 0) > 0,
  });
  const step = () =>
    props.task.state === 'running' ? currentStep(data.session.message.list(props.task.id), openRequests()) : undefined;
  const formatPath = (path: string) => pathInProject(path, props.location?.directory) ?? context.ui.format.path(path);
  const model = () =>
    subagentModelName(props.task, data.location.agent.list(props.location), data.location.model.list(props.location));
  const usage = () => usageLabel(model(), data.session.cost(props.task.id));

  const loadSubagent = () => {
    const childID = props.task.id;
    if (data.session.get(childID) === undefined) {
      void data.session.sync(childID);
    }
    void data.session.message.sync(childID);
  };

  createEffect(loadSubagent);

  return (
    <>
      <Show when={step()}>
        {(current: Accessor<SubagentStep>) => (
          <DetailLine
            text={stepLabel(current(), formatPath)}
            color={isWaitingOnUser(current()) ? theme.text.feedback.warning.base : theme.text.muted}
          />
        )}
      </Show>
      <Show when={usage()}>{(text: Accessor<string>) => <DetailLine text={text()} color={theme.text.muted} />}</Show>
    </>
  );
};
