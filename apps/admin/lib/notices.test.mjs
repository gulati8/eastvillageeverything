/**
 * Unit tests for the notice reducer behind the admin feedback overlay.
 *
 * Run (Node >= 22.18, which strips types from `.ts` imports natively):
 *   cd apps/admin && node --test lib/notices.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AUTO_DISMISS_MS, autoDismissMs, nextExpiry, reduceNotices, stripeClass } from './notices.ts';

const T0 = 1_000_000;

function add(state, id, kind, now = T0, extra = {}) {
  return reduceNotices(state, { type: 'add', id, input: { kind, title: `${kind} ${id}`, ...extra }, now });
}

describe('autoDismissMs', () => {
  it('times out success and info, never error', () => {
    assert.equal(autoDismissMs('success'), AUTO_DISMISS_MS);
    assert.equal(autoDismissMs('info'), AUTO_DISMISS_MS);
    assert.equal(autoDismissMs('error'), null);
  });
});

describe('reduceNotices add', () => {
  it('appends in order with the input fields and an expiry for success', () => {
    let s = add([], 'a', 'success', T0, { detail: 'more' });
    s = add(s, 'b', 'info', T0 + 10);
    assert.deepEqual(s.map((n) => n.id), ['a', 'b']);
    assert.equal(s[0].title, 'success a');
    assert.equal(s[0].detail, 'more');
    assert.equal(s[0].expiresAt, T0 + AUTO_DISMISS_MS);
    assert.equal(s[1].expiresAt, T0 + 10 + AUTO_DISMISS_MS);
    assert.equal(s[0].remainingMs, null);
  });

  it('gives error notices no expiry', () => {
    const s = add([], 'e', 'error');
    assert.equal(s[0].expiresAt, null);
    assert.equal(s[0].remainingMs, null);
  });

  it('does not mutate the previous state', () => {
    const before = add([], 'a', 'success');
    const frozen = Object.freeze([...before]);
    const after = reduceNotices(frozen, { type: 'add', id: 'b', input: { kind: 'info', title: 'x' }, now: T0 });
    assert.equal(frozen.length, 1);
    assert.equal(after.length, 2);
  });
});

describe('reduceNotices dismiss', () => {
  it('removes only the named notice', () => {
    let s = add([], 'a', 'success');
    s = add(s, 'b', 'error');
    s = reduceNotices(s, { type: 'dismiss', id: 'a' });
    assert.deepEqual(s.map((n) => n.id), ['b']);
  });

  it('ignores unknown ids', () => {
    const s = add([], 'a', 'success');
    assert.deepEqual(reduceNotices(s, { type: 'dismiss', id: 'nope' }), s);
  });
});

describe('reduceNotices tick (auto-expiry)', () => {
  it('drops timed notices at or past their expiry and keeps the rest', () => {
    let s = add([], 'a', 'success', T0);
    s = add(s, 'b', 'info', T0 + 1000);
    s = add(s, 'e', 'error', T0);
    const atA = reduceNotices(s, { type: 'tick', now: T0 + AUTO_DISMISS_MS });
    assert.deepEqual(atA.map((n) => n.id), ['b', 'e']);
    const atB = reduceNotices(atA, { type: 'tick', now: T0 + 1000 + AUTO_DISMISS_MS });
    assert.deepEqual(atB.map((n) => n.id), ['e']);
  });

  it('keeps a notice one ms before its expiry', () => {
    const s = add([], 'a', 'success', T0);
    assert.equal(reduceNotices(s, { type: 'tick', now: T0 + AUTO_DISMISS_MS - 1 }).length, 1);
  });
});

describe('reduceNotices pause and resume', () => {
  it('pausing freezes the remaining time and stops the tick from expiring it', () => {
    let s = add([], 'a', 'success', T0);
    s = reduceNotices(s, { type: 'pause', id: 'a', now: T0 + 1500 });
    assert.equal(s[0].expiresAt, null);
    assert.equal(s[0].remainingMs, AUTO_DISMISS_MS - 1500);
    s = reduceNotices(s, { type: 'tick', now: T0 + 60_000 });
    assert.equal(s.length, 1, 'a paused notice never expires');
  });

  it('resuming restarts the clock from the remaining time', () => {
    let s = add([], 'a', 'success', T0);
    s = reduceNotices(s, { type: 'pause', id: 'a', now: T0 + 1500 });
    s = reduceNotices(s, { type: 'resume', id: 'a', now: T0 + 9000 });
    assert.equal(s[0].expiresAt, T0 + 9000 + (AUTO_DISMISS_MS - 1500));
    assert.equal(s[0].remainingMs, null);
  });

  it('pause and resume are no-ops for error notices and unknown ids', () => {
    const s = add([], 'e', 'error', T0);
    assert.deepEqual(reduceNotices(s, { type: 'pause', id: 'e', now: T0 + 1 }), s);
    assert.deepEqual(reduceNotices(s, { type: 'resume', id: 'e', now: T0 + 1 }), s);
    assert.deepEqual(reduceNotices(s, { type: 'pause', id: 'zz', now: T0 + 1 }), s);
  });

  it('resume without a pause does nothing', () => {
    const s = add([], 'a', 'success', T0);
    assert.deepEqual(reduceNotices(s, { type: 'resume', id: 'a', now: T0 + 1 }), s);
  });
});

describe('nextExpiry', () => {
  it('returns null when nothing is timed', () => {
    assert.equal(nextExpiry([]), null);
    assert.equal(nextExpiry(add([], 'e', 'error')), null);
  });

  it('returns the soonest expiry, ignoring paused and sticky notices', () => {
    let s = add([], 'late', 'success', T0 + 500);
    s = add(s, 'soon', 'info', T0);
    s = add(s, 'e', 'error', T0);
    s = add(s, 'paused', 'success', T0 - 3000);
    s = reduceNotices(s, { type: 'pause', id: 'paused', now: T0 });
    assert.equal(nextExpiry(s), T0 + AUTO_DISMISS_MS);
  });
});

describe('stripeClass', () => {
  it('maps every kind to a left-border class', () => {
    assert.equal(stripeClass('success'), 'border-l-[#3F7D4E]');
    assert.equal(stripeClass('error'), 'border-l-[#C44]');
    assert.equal(stripeClass('info'), 'border-l-accent');
  });
});
