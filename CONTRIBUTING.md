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

Releases are published from GitHub Actions and approved by hand. Start inside `nix-shell`, from a clean `main` that matches GitHub.

1. Run the release script for the kind of change. `pnpm release:patch` is for bug fixes, `pnpm release:minor` for new features and `pnpm release:major` for breaking changes. Below 1.0.0, a breaking change is a minor release. The script bumps `package.json`, commits it as "Release 0.2.0", tags it `v0.2.0` and pushes the commit and the tag
2. The tag starts `.github/workflows/release.yml`, which checks the tag matches `package.json`, runs the checks and the build, and stages the package on npm with `npm stage publish`. It then creates the GitHub release, listing the commit subjects since the previous tag. npm trusts this workflow through trusted publishing, so no token is stored anywhere
3. On npmjs.com, open the package's Staged Packages tab and approve the release with a 2FA code
4. Run `npm view opencode-background-tasks version` and confirm it prints the new version

If the workflow fails, fix the problem in a new commit and push it, then move the tag onto that commit with `git tag -f v0.2.0 && git push -f origin v0.2.0`, using the version that failed. Nothing reaches npm until a release is approved, so a failed run leaves nothing to clean up.

## The demo

`pnpm demo` records `docs/readme/demo.gif` from OpenCode running in a scratch project. Everything the demo needs lives in `scripts/demo/`, and `record.sh` is the only file there to run.

The agent's model is `scripts/demo/mock-model/`, a local OpenAI-compatible server that answers every request with a scripted reply. It makes the same tool calls and writes the same words on every run, so the gif never depends on a real model's mood. The shells and the subagent those tool calls start still really run, which is what the sidebar shows. `server.ts` speaks the streaming protocol and knows nothing of this demo. To change what the agent says or does, edit `scene.ts`.
