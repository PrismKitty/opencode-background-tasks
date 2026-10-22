import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appendedOutput, isMissingShell, KEPT_OUTPUT_LENGTH, readableOutput } from '#src/shells/shell-output.ts';

describe('appendedOutput', () => {
  it('adds a page to the end of what was read so far', () => {
    assert.deepEqual(appendedOutput({ text: 'one\n', isMissingEarlierOutput: false }, 'two\n'), {
      text: 'one\ntwo\n',
      isMissingEarlierOutput: false,
    });
  });
  it('keeps the latest output under the limit, and says when it drops earlier output', () => {
    const output = appendedOutput({ text: 'a'.repeat(KEPT_OUTPUT_LENGTH), isMissingEarlierOutput: false }, 'bc');
    assert.equal(output.text.length, KEPT_OUTPUT_LENGTH);
    assert.equal(output.text.endsWith('abc'), true);
    assert.equal(output.isMissingEarlierOutput, true);
  });
  it('remembers output dropped before', () => {
    assert.equal(appendedOutput({ text: '', isMissingEarlierOutput: true }, 'x').isMissingEarlierOutput, true);
  });
});

describe('readableOutput', () => {
  it('drops colours, hyperlinks and character set switches', () => {
    assert.equal(readableOutput('\x1b[1;32mPASS\x1b[0m test'), 'PASS test');
    assert.equal(readableOutput('\x1b]8;;https://example.com\x07link\x1b]8;;\x07'), 'link');
    assert.equal(readableOutput('\x1b]8;;https://example.com\x1b\\link\x1b]8;;\x1b\\'), 'link');
    assert.equal(readableOutput('done\x1b(B\x1b[m'), 'done');
  });
  it('shows a line redrawn with carriage returns at its last drawing', () => {
    assert.equal(readableOutput('Downloading 10%\rDownloading 90%\rDownloaded\nnext'), 'Downloaded\nnext');
    assert.equal(readableOutput('Building 40%\r'), 'Building 40%');
  });
  it('treats a Windows line ending as a plain one', () => {
    assert.equal(readableOutput('one\r\ntwo\r\n'), 'one\ntwo\n');
  });
});

describe('isMissingShell', () => {
  it('recognises the error OpenCode raises for a shell it no longer has', () => {
    assert.equal(isMissingShell({ _tag: 'ShellNotFoundError', id: 'sh', message: 'gone' }), true);
    assert.equal(isMissingShell({ _tag: 'RpcInternalError' }), false);
    assert.equal(isMissingShell(new Error('network')), false);
    assert.equal(isMissingShell(undefined), false);
  });
});
