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

/**
 * Splits a source file into its `export async function` blocks. Helpers that
 * sit between two exports are folded into the preceding block, which is fine
 * for a "contains" check.
 */
function exportedFunctionBlocks(source) {
  return source
    .split(/(?=^export async function )/m)
    .slice(1)
    .map((block) => ({ name: block.match(/^export async function (\w+)/)[1], block }));
}

describe('admin feedback', () => {
  it('every exported action that redirects also sets a flash notice', () => {
    for (const file of ['./actions/places.ts', './actions/tags.ts', './actions/neighborhoods.ts']) {
      const blocks = exportedFunctionBlocks(src(file));
      assert.ok(blocks.length > 0, `${file} must export actions`);
      for (const { name, block } of blocks) {
        if (!/\bredirect\(/.test(block)) continue;
        assert.match(block, /\bsetFlash\(/, `${name} in ${file} redirects without calling setFlash`);
      }
    }
  });
});

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

  it('guards every mutating photo action', () => {
    const photos = src('./actions/photos.ts');
    for (const name of ['removePlacePhoto', 'makeFirstPlacePhoto', 'setPlacePhotoCredit']) {
      assertGuarded(photos, name, 'requireAdminMutation');
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

  it('answers signed-out API calls with JSON 401, not a login redirect', () => {
    const middleware = src('../middleware.ts');
    assert.match(middleware, /startsWith\('\/api\/'\)[^]*?NextResponse\.json\(\{ error: 'Signed out' \}, \{ status: 401 \}\)/, 'middleware must return 401 JSON for /api/* without a session');
  });
});
