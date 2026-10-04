import type { BackgroundTask } from '#src/tasks.ts';

export const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
};

export const headingLabel = (tasks: readonly Pick<BackgroundTask, 'state'>[]): string => {
  const runningCount = tasks.filter((task) => task.state === 'running').length;
  return runningCount === 0 ? 'Background' : `Background · ${runningCount} running`;
};
