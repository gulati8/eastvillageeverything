import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

function src(path) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

function assertGuarded(source, functionName, guardName) {
  const pattern = new RegExp(`export async function ${functionName}[^]*?{\\n\\s*await ${guardName}\\(`);
  assert.match(source, pattern, `${functionName} must call ${guardName} before doing work`);
}

describe('admin security guards', () => {
  it('guards every mutating place action', () => {
    const places = src('./actions/places.ts');
    for (const name of ['createPlace', 'updatePlace', 'deletePlace']) {
      assertGuarded(places, name, 'requireAdminMutation');
    }
  });

  it('guards every mutating tag action', () => {
    const tags = src('./actions/tags.ts');
    for (const name of ['createTag', 'updateTag', 'deleteTag', 'reorderTags', 'createTagInline']) {
      assertGuarded(tags, name, 'requireAdminMutation');
    }
  });

  it('guards every mutating neighborhood action', () => {
    const neighborhoods = src('./actions/neighborhoods.ts');
    for (const name of ['createNeighborhood', 'updateNeighborhood', 'deleteNeighborhood', 'createNeighborhoodInline']) {
      assertGuarded(neighborhoods, name, 'requireAdminMutation');
    }
  });

  it('guards login and logout against cross-origin form posts', () => {
    const login = src('./actions/login.ts');
    assertGuarded(login, 'loginAction', 'assertSameOriginAction');
    assertGuarded(login, 'logoutAction', 'assertSameOriginAction');
    assert.match(login, /sanitizeAdminNextPath/, 'login must sanitize next redirect');
  });

  it('guards admin API routes explicitly', () => {
    const tagsRoute = src('../app/api/admin/tags/route.ts');
    const uploadsRoute = src('../app/api/admin/uploads/route.ts');
    assert.match(tagsRoute, /requireAdminRequest\(req\)/, 'tags API must require an admin session');
    assert.match(uploadsRoute, /requireAdminRequest\(req, \{ mutation: true \}\)/, 'upload API must require admin session and origin check');
  });
});
