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
        'tasks.ts and labels.ts are plain functions the tests run under node, so they know nothing of the screen',
      from: { path: '^src/(tasks|labels)\\.ts$' },
      to: { path: '^src/.*\\.tsx$|solid-js|@opentui|@opencode/plugin' },
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
