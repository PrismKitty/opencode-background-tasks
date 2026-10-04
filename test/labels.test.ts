import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatDuration, headingLabel } from '#src/labels.ts';

describe('formatDuration', () => {
  it('shows seconds, then minutes and seconds, then hours and minutes', () => {
    assert.equal(formatDuration(42_900), '42s');
    assert.equal(formatDuration(184_000), '3m 04s');
    assert.equal(formatDuration(3_720_000), '1h 02m');
  });
  it('never goes negative when clocks disagree', () => {
    assert.equal(formatDuration(-5), '0s');
  });
});

describe('headingLabel', () => {
  it('counts running tasks, and drops the count once none are running', () => {
    assert.equal(
      headingLabel([{ state: 'running' }, { state: 'running' }, { state: 'succeeded' }]),
      'Background · 2 running',
    );
    assert.equal(headingLabel([{ state: 'failed' }]), 'Background');
  });
});
