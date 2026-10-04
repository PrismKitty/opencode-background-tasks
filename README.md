<picture>
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/PrismKitty/opencode-background-tasks/main/docs/readme/header-light.png">
  <img src="https://raw.githubusercontent.com/PrismKitty/opencode-background-tasks/main/docs/readme/header-dark.png" alt="Background tasks, an OpenCode plugin by PrismKitty">
</picture>

# opencode-background-tasks

[![npm](https://img.shields.io/npm/v/opencode-background-tasks)](https://www.npmjs.com/package/opencode-background-tasks) [![CI](https://github.com/PrismKitty/opencode-background-tasks/actions/workflows/check.yml/badge.svg)](https://github.com/PrismKitty/opencode-background-tasks/actions/workflows/check.yml) ![OpenCode v2](https://img.shields.io/badge/OpenCode-v2-blue) [![MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

> A sidebar list of the background shells and subagents still running in an [OpenCode](https://opencode.ai) v2 session.

An agent can send a long build, a test run or a subagent to the background and carry on talking. Twenty messages later, nothing on screen says the build is still going. This plugin adds a **Background** list to the session sidebar, with a live timer on each task and a `✓` or `✗` when it ends.

![An agent starts two background shells and a subagent, and the sidebar counts them up, then marks each one done or failed](https://raw.githubusercontent.com/PrismKitty/opencode-background-tasks/main/docs/readme/demo.gif)

## Install

Needs OpenCode v2. Add the plugin to the `plugins` list in `~/.config/opencode/cli.json`:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["opencode-background-tasks"]
}
```

Restart OpenCode. The list appears in the session sidebar the next time a task goes to the background.

To update, run `opencode plugin update opencode-background-tasks`.

## What it does

- Lists every shell and subagent the session sent to the background, whether the agent asked for that up front or you moved running work there with `ctrl+b`
- Counts up each task's running time once a second
- Marks a finished task `✓`, or `✗` for a non-zero exit, a kill, a timeout or a failed subagent. A finished task keeps its final time and stays on the list for 10 seconds
- Hides the whole list when no task is running or recently finished
- Counts the running tasks in the heading, as in `Background · 2 running`

## How it knows

The plugin works out everything from the session's own history, so it runs inside the TUI and needs nothing installed on the server side.

A task counts as background work when the agent's shell or subagent call hands back control while the work is still running. From then on, the plugin follows each task as it runs. For a shell, it watches OpenCode's list of running shells and the `session.shell.ended` event. For a subagent, it watches the status of the subagent's own session.

Restarting OpenCode clears those live records. For a task that finished before the restart, the plugin falls back to the notice OpenCode posts into the session when a task ends. That notice is stamped with the time it arrived rather than the moment the task ended, so the final time shown for that task can be a little long. A task with neither a live record nor a notice, such as a shell that the restart itself stopped, is left off the list.

## Limits

- The list sits wherever OpenCode places sidebar plugins, in the order the plugins were enabled. The list can't be pinned above or below another plugin's section
- The list only shows tasks from the session you're looking at. When a subagent starts background work of its own, that work belongs to the subagent's session, so it doesn't appear in the parent session's list

Tested with OpenCode 2.0.19.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the dev setup and the code layout.

## More plugins

[opencode-shortcuts](https://github.com/PrismKitty/opencode-shortcuts) shows every OpenCode keyboard shortcut on one screen and lets you rebind them in place.

## License

MIT © PrismKitty
