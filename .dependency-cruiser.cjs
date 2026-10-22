/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Files must not import each other in a loop',
      from: {},
      to: { circular: true },
    },
    {
      name: 'logic-below-ui',
      severity: 'error',
      comment:
        'tasks/, subagents/ and shells/ are plain functions the tests run under node, so they know nothing of the screen',
      from: { path: '^src/(tasks|subagents|shells)/' },
      to: { path: '^src/(ui/|tui\\.tsx$)|solid-js|@opentui|@opencode/plugin' },
    },
    {
      name: 'tasks-at-the-bottom',
      severity: 'error',
      comment: 'tasks/ holds what every other folder builds on, so it imports none of them',
      from: { path: '^src/tasks/' },
      to: { path: '^src/', pathNot: '^src/tasks/' },
    },
    {
      name: 'subagents-and-shells-apart',
      severity: 'error',
      comment: 'subagents/ and shells/ are separate features, joined only in ui/',
      from: { path: '^src/(subagents|shells)/' },
      to: { path: '^src/(subagents|shells)/', pathNot: '^src/$1/' },
    },
    {
      name: 'entry-point-imported-by-nothing',
      severity: 'error',
      comment: 'tui.tsx is the entry point, so nothing in src imports it',
      from: {},
      to: { path: '^src/tui\\.tsx$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
