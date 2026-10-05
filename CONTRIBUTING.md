# Contributing

## Setup

The repo carries a `shell.nix` with Node 24, pnpm and the demo tools. `pnpm check` checks formatting, types and the import rules, then runs the tests.

## Layout

| File              | Holds                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `src/tasks.ts`    | Finding background tasks in the session history and working out whether each one is done |
| `src/labels.ts`   | The durations and heading the sidebar prints                                             |
| `src/sidebar.tsx` | The Solid components, the one-second clock and the live lookups                          |
| `src/tui.tsx`     | The plugin entry point                                                                   |

`tasks.ts` and `labels.ts` import nothing from the UI, so the tests run them under plain Node. `pnpm dependencies:check` enforces that.

## Running it

`pnpm dev` starts OpenCode with this checkout as its only TUI plugin, in a throwaway config directory, so your own `cli.json` is never touched.

## The npm build

`pnpm build` compiles `src/` into `dist/` the way OpenCode compiles a local plugin, which is what the published package ships. `pnpm pack` and `pnpm publish` run the checks and the build first.

## Releasing

Releases go out by hand, inside `nix-shell`, from a clean `main` that matches GitHub.

1. Run the release script for the kind of change. `pnpm release:patch` is for bug fixes, `pnpm release:minor` for new features and `pnpm release:major` for breaking changes. Below 1.0.0, a breaking change is a minor release. The script bumps `package.json`, commits it as "Release 0.2.0", tags it `v0.2.0` and pushes the commit and the tag
2. Wait for the `check` workflow to pass on GitHub
3. Run `pnpm publish`. It runs the checks and the build again, then asks for a 2FA code
4. Run `npm view opencode-background-tasks version` and confirm it prints the new version. npm sometimes holds a release for review for a minute, and shows the old version or a `0.0.0-stage` placeholder until it clears

If `pnpm publish` fails after the push, fix the problem in a new commit, push it and publish again, without bumping the version a second time.

## The demo

`pnpm demo` records `docs/readme/demo.gif` from OpenCode running in a scratch project. Everything the demo needs lives in `scripts/demo/`, and `record.sh` is the only file there to run.

The agent's model is `scripts/demo/mock-model/`, a local OpenAI-compatible server that answers every request with a scripted reply. It makes the same tool calls and writes the same words on every run, so the gif never depends on a real model's mood. The shells and the subagent those tool calls start still really run, which is what the sidebar shows. `server.ts` speaks the streaming protocol and knows nothing of this demo. To change what the agent says or does, edit `scene.ts`.
