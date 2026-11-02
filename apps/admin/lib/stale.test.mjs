/**
 * Unit tests for the stale-deployment helpers.
 *
 * Run (Node >= 22.18, which strips types from `.ts` imports natively):
 *   cd apps/admin && node --test lib/stale.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isStaleActionError, versionChanged } from './stale.ts';

describe('isStaleActionError', () => {
  it('matches the message Next raises for an unknown Server Action', () => {
    assert.equal(isStaleActionError('Failed to find Server Action "40e2f1". This request might be from an older or newer deployment.'), true);
    assert.equal(isStaleActionError('Failed to find Server Action "abc"'), true);
  });

  it('matches a Server Action error that mentions a deployment', () => {
    assert.equal(isStaleActionError('Server Action mismatch between this deployment and the client'), true);
  });

  it('ignores other errors and non-strings', () => {
    assert.equal(isStaleActionError('Place not found'), false);
    assert.equal(isStaleActionError('Server Action threw'), false);
    assert.equal(isStaleActionError('A deployment is in progress'), false);
    assert.equal(isStaleActionError(undefined), false);
    assert.equal(isStaleActionError(null), false);
  });
});

describe('versionChanged', () => {
  it('is true only when both ids are known and differ', () => {
    assert.equal(versionChanged('a', 'b'), true);
    assert.equal(versionChanged('a', 'a'), false);
    assert.equal(versionChanged(null, 'a'), false);
    assert.equal(versionChanged('a', null), false);
    assert.equal(versionChanged(null, null), false);
  });
});
