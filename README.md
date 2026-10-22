<picture>
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/PrismKitty/opencode-background-tasks/main/docs/readme/header-light.png">
  <img src="https://raw.githubusercontent.com/PrismKitty/opencode-background-tasks/main/docs/readme/header-dark.png" alt="Background tasks, an OpenCode plugin by PrismKitty">
</picture>

# opencode-background-tasks

[![npm](https://img.shields.io/npm/v/opencode-background-tasks)](https://www.npmjs.com/package/opencode-background-tasks) [![CI](https://github.com/PrismKitty/opencode-background-tasks/actions/workflows/check.yml/badge.svg)](https://github.com/PrismKitty/opencode-background-tasks/actions/workflows/check.yml) ![OpenCode v2](https://img.shields.io/badge/OpenCode-v2-blue) [![MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

> A sidebar list of the background shells and subagents still running in an [OpenCode](https://opencode.ai) v2 session.

An agent can send a long build, a test run or a subagent to the background and carry on talking. Twenty messages later, nothing on screen says the build is still going. This plugin adds a **Background** list to the session sidebar, with a live timer on each task and a `✓` or `✗` when it ends. Click a subagent to open its session, or click a shell to follow its output beside the chat.

![An agent starts two background shells and a subagent. The sidebar times each one and shows the subagent's current step. Clicking the subagent opens its session, and clicking the build opens its output beside the chat. Each task is then marked done or failed](https://raw.githubusercontent.com/PrismKitty/opencode-background-tasks/main/docs/readme/demo.gif)

## Install

Needs OpenCode v2. OpenCode v1 skips the plugin without showing an error.

Run `opencode plugin add opencode-background-tasks`, or add the plugin to the `plugins` list in `~/.config/opencode/cli.json` yourself:

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
- Names what each task is. A shell reads as `Shell: ./build.sh`, and a subagent by its agent and description, as in `General: Research UK display`
- Shows what a running subagent is doing under its name, such as `Read: src/tasks.ts` or `Thinking`. A subagent waiting on a permission or a question says so in the warning colour, since it can't go on until you answer
- Shows a subagent's model and what it has cost so far under that. The model is the one the call asked for, or else the one the agent is configured with
- Marks every row you can open with a `›` after its timer
- Opens a subagent's session when you click its row. `esc` or `up` takes you back to the parent session
- Opens a panel beside the chat when you click a shell's row, following the shell's output as it arrives. Colour codes are dropped, and a progress bar redrawn on one line shows its latest state. `↑`/`↓`, `page up`/`page down`, `home` and `end` scroll the output, and `esc` closes the panel
- Counts up each task's running time once a second
- Marks a finished task `✓`, or `✗` for a non-zero exit, a kill, a timeout or a failed subagent. A finished task keeps its final time and stays on the list for 10 seconds
- Hides the whole list when no task is running or recently finished
- Counts the running tasks in the heading, as in `Background · 2 running`

## How it knows

The plugin works out everything from the session's own history, so it runs inside the TUI and needs nothing installed on the server side.

A task counts as background work when the agent's shell or subagent call hands back control while the work is still running. From then on, the plugin follows each task as it runs. For a shell, it watches OpenCode's list of running shells and the `shell.exited` event. For a subagent, it watches the subagent's own session: its status, its latest message for the current step, and its cost. The shell panel asks OpenCode for new output once a second while it's open, and keeps the most recent 64K characters.

Restarting OpenCode clears those live records. For a task that finished before the restart, the plugin falls back to the notice OpenCode posts into the session when a task ends. That notice is stamped with the time it arrived rather than the moment the task ended, so the final time shown for that task can be a little long. A task with neither a live record nor a notice, such as a shell that the restart itself stopped, is left off the list.

## Limits

- The list sits wherever OpenCode places sidebar plugins, in the order the plugins were enabled. The list can't be pinned above or below another plugin's section
- The list only shows tasks from the session you're looking at. When a subagent starts background work of its own, that work belongs to the subagent's session, so it doesn't appear in the parent session's list
- OpenCode puts the shell panel where the sidebar was, so the list is hidden until the panel closes. The panel takes the keyboard when it opens, and the shortcut in its footer, `ctrl+x ←` by default, hands the keyboard back to the prompt without closing it

Tested with OpenCode 2.1.1.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the dev setup and the code layout.

## More plugins

[opencode-shortcuts](https://github.com/PrismKitty/opencode-shortcuts) shows every OpenCode keyboard shortcut on one screen and lets you rebind them in place.

## License

MIT © PrismKitty
