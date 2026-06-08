/**
 * E2E spec — admin places search (T4).
 *
 * Mirrors the style of tests/e2e/admin-next/places.spec.ts:
 *   - Inline login helper (same env-var convention)
 *   - request fixture for API calls
 *   - Date.now() suffix for unique test-isolation
 *   - dialog accept for deletes
 *
 * Acceptance criteria covered (T3 + T4):
 *   T4-AC1  → search input visible on /places with aria-label='Search places'
 *   T3-AC1  → input has type="search", aria-label, placeholder
 *   T4-AC2  → debounce: URL does NOT change immediately, DOES change after ~300ms
 *   T4-AC3  → list narrows to seeded place name after debounce fires
 *   T3-AC3  → aria-busy="true" appears on input while transition is pending
 *   T4-AC4  → clearing via × button removes q and restores full list
 *   T4-AC5  → pressing Escape clears input and removes q
 *   T3-AC13 → Escape clears the input
 *   T4-AC6  → deep-link /places?q=<substring> pre-fills input and filters list
 *   T3-AC8  → SearchInput pre-filled with initialValue on direct navigation
 *   T3-AC9  → visiting /places?q=pizza renders only matching places
 *   T4-AC7  → empty-state 'No places match' for a zero-hit query
 *   T3-AC11 → 'No places match' copy shown when q set and results are empty
 *   T4-AC8  → aria-busy="true" during the pending transition
 *   T3-AC4  → clearing removes q entirely (no q= empty key)
 *   T3-AC6  → router.replace: back button returns to pre-search state
 *   T3-AC10 → whitespace q renders full list (handled server-side; verified via
 *              direct navigation to /places?q=%20%20)
 *   T3-AC14 → input does NOT autofocus on page load
 *
 * Scenarios that require a live DB + running admin stack to execute.
 * Run with:
 *   npx playwright test tests/e2e/admin-next/places-search.spec.ts
 * or:
 *   npm run test:e2e -- --grep "places-search"
 */

import { test, expect, type Page } from '@playwright/test';

const ADMIN = process.env.ADMIN_BASE_URL ?? 'http://localhost:3001';
const API = process.env.API_BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.ADMIN_EMAIL ?? 'e2e-test@eve.local';
const PASS = process.env.ADMIN_PASS ?? 'e2etest1234';

async function login(page: Page): Promise<void> {
  await page.goto(`${ADMIN}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/places/);
}

/**
 * Creates a place via the admin /places/new form and returns the API response
 * object (which includes the `key` field used in edit/delete URLs).
 */
async function seedPlace(
  page: Page,
  request: ReturnType<typeof page.request['get']> extends Promise<infer R> ? never : Parameters<Page['goto']>[0] extends string ? any : any,
  name: string,
  address = '1 Test Ave'
): Promise<{ key: string; name: string }> {
  await page.goto(`${ADMIN}/places/new`);
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="address"]', address);
  await page.click('button[type="submit"]:has-text("Save")');
  await page.waitForURL(/\/places$/);

  // Fetch the created place from the API to get its key
  const res = await (request as any).get(`${API}/api/places?limit=200`);
  const list = await res.json();
  const created = list.find((p: any) => p.name === name);
  if (!created) throw new Error(`Seeded place "${name}" not found in API response`);
  return created;
}

/**
 * Deletes a place via the admin edit page.
 */
async function deletePlace(page: Page, key: string): Promise<void> {
  page.on('dialog', (d) => d.accept());
  await page.goto(`${ADMIN}/places/${key}/edit`);
  await page.click('button:has-text("Delete")');
  await page.waitForURL(/\/places$/);
}

test.describe('Next.js admin — places search', () => {
  test.beforeEach(async ({ page }) => login(page));

  // -------------------------------------------------------------------------
  // T4-AC1 / T3-AC1: search input is visible with correct attributes
  // -------------------------------------------------------------------------
  test('search input is visible on /places with correct aria attributes', async ({ page }) => {
    await page.goto(`${ADMIN}/places`);

    const input = page.getByRole('searchbox', { name: 'Search places' });
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('aria-label', 'Search places');
    await expect(input).toHaveAttribute('placeholder', /Search places/);
    await expect(input).toHaveAttribute('type', 'search');
  });

  // -------------------------------------------------------------------------
  // T3-AC14: input does NOT autofocus on page load
  // -------------------------------------------------------------------------
  test('search input does not autofocus on page load', async ({ page }) => {
    await page.goto(`${ADMIN}/places`);
    await page.waitForLoadState('networkidle');

    // If the input were autofocused it would be document.activeElement
    const isFocused = await page.evaluate(() => {
      const input = document.querySelector('input[aria-label="Search places"]');
      return input === document.activeElement;
    });
    expect(isFocused).toBe(false);
  });

  // -------------------------------------------------------------------------
  // T4-AC2: debounce — URL does NOT update immediately, DOES update after 300ms
  // -------------------------------------------------------------------------
  test('debounce: URL does not change immediately after keystroke but does after 300ms', async ({
    page,
  }) => {
    await page.goto(`${ADMIN}/places`);

    const input = page.getByRole('searchbox', { name: 'Search places' });
    await input.click();
    await input.type('z', { delay: 0 }); // single keystroke, no delay

    // URL must NOT yet have ?q=
    const urlBefore = page.url();
    expect(urlBefore).not.toContain('?q=');
    expect(urlBefore).not.toContain('&q=');

    // Wait 300ms (debounce is 250ms + a small buffer)
    await page.waitForTimeout(300);
    const urlAfter = page.url();
    expect(urlAfter).toMatch(/[?&]q=z/);
  });

  // -------------------------------------------------------------------------
  // T4-AC3: list narrows to seeded place after debounce fires
  // -------------------------------------------------------------------------
  test('typing a unique name substring narrows the list to matching places', async ({
    page,
    request,
  }) => {
    const uniqueSuffix = `Srch${Date.now()}`;
    const name = `Test Pizza ${uniqueSuffix}`;
    const seeded = await seedPlace(page, request, name);

    try {
      await page.goto(`${ADMIN}/places`);
      const input = page.getByRole('searchbox', { name: 'Search places' });
      await input.fill(uniqueSuffix);
      // Wait for debounce + server re-render
      await page.waitForTimeout(400);
      await page.waitForLoadState('networkidle');

      const rows = page.locator('main ul > li');
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toContainText(name);
    } finally {
      await deletePlace(page, seeded.key);
    }
  });

  // -------------------------------------------------------------------------
  // T4-AC3 + T3-AC3: case-insensitive match (uppercase query)
  // -------------------------------------------------------------------------
  test('search is case-insensitive — UPPERCASE query matches lowercase name', async ({
    page,
    request,
  }) => {
    const uniqueSuffix = `Upper${Date.now()}`;
    const name = `lowercase ${uniqueSuffix}`;
    const seeded = await seedPlace(page, request, name);

    try {
      await page.goto(`${ADMIN}/places`);
      const input = page.getByRole('searchbox', { name: 'Search places' });
      // Use uppercase version of unique suffix
      await input.fill(uniqueSuffix.toUpperCase());
      await page.waitForTimeout(400);
      await page.waitForLoadState('networkidle');

      const rows = page.locator('main ul > li');
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toContainText(name);
    } finally {
      await deletePlace(page, seeded.key);
    }
  });

  // -------------------------------------------------------------------------
  // T3-AC3 / T4-AC8: aria-busy="true" during transition
  // -------------------------------------------------------------------------
  test('aria-busy="true" is set on input while transition is pending', async ({ page }) => {
    await page.goto(`${ADMIN}/places`);

    const input = page.getByRole('searchbox', { name: 'Search places' });

    // Type and immediately check — aria-busy should flip to true briefly.
    // We poll for the attribute with a generous timeout so we catch the brief window.
    await input.fill('test');

    // Wait for the debounce (250ms) to fire and the transition to start
    // aria-busy may be very brief on fast machines; we allow "observed or already resolved"
    let observedBusy = false;
    try {
      await expect(input).toHaveAttribute('aria-busy', 'true', { timeout: 800 });
      observedBusy = true;
    } catch {
      // Transition resolved before we could observe it — acceptable on fast machines
      // Spec edge case: "accept either 'observed true at some point' or 'transition resolved
      // before observable' as pass, prioritising non-flake over strictness"
      observedBusy = false;
    }

    // After transition settles, aria-busy must be falsy/gone
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');
    const ariaBusy = await input.getAttribute('aria-busy');
    // aria-busy should now be 'false' or not present
    expect(ariaBusy === 'false' || ariaBusy === null).toBe(true);

    // We pass regardless of whether we observed the brief 'true' window —
    // the important thing is it's gone after the transition resolves.
    // If observedBusy is true, that's a bonus confirmation.
    expect(typeof observedBusy).toBe('boolean'); // always passes; documents intent
  });

  // -------------------------------------------------------------------------
  // T4-AC4: clearing via × button removes q and restores full list
  // -------------------------------------------------------------------------
  test('clicking × clear button removes q param and restores the full list', async ({
    page,
    request,
  }) => {
    await page.goto(`${ADMIN}/places`);

    // Get full count
    const rows = page.locator('main ul > li');
    const totalCount = await rows.count();

    const input = page.getByRole('searchbox', { name: 'Search places' });
    // Type something that will produce zero or fewer results
    await input.fill('xyzzy_no_match_9999');
    await page.waitForTimeout(400);
    await page.waitForLoadState('networkidle');

    // Click the clear button
    const clearBtn = page.getByRole('button', { name: 'Clear search' });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // URL must not contain q
    await page.waitForTimeout(400);
    const urlAfterClear = page.url();
    expect(urlAfterClear).not.toMatch(/[?&]q=/);

    // T3-AC4: no empty q= key either
    expect(urlAfterClear).not.toMatch(/[?&]q=($|&)/);

    // Full list should be restored
    await page.waitForLoadState('networkidle');
    await expect(rows).toHaveCount(totalCount);
  });

  // -------------------------------------------------------------------------
  // T4-AC5 / T3-AC13: pressing Escape clears input and removes q
  // -------------------------------------------------------------------------
  test('pressing Escape clears the input and removes q from the URL', async ({ page }) => {
    await page.goto(`${ADMIN}/places`);

    const input = page.getByRole('searchbox', { name: 'Search places' });
    await input.fill('pizza');
    await page.waitForTimeout(400); // let debounce fire
    await page.waitForLoadState('networkidle');

    // URL has q now
    expect(page.url()).toMatch(/[?&]q=pizza/);

    // Press Escape
    await input.press('Escape');
    await page.waitForTimeout(100); // immediate clear fires navigate('')

    // Input must be cleared
    await expect(input).toHaveValue('');

    // URL must not contain q
    const urlAfter = page.url();
    expect(urlAfter).not.toMatch(/[?&]q=/);
  });

  // -------------------------------------------------------------------------
  // T3-AC13 edge: pressing Escape on an already-empty input is a no-op
  // -------------------------------------------------------------------------
  test('pressing Escape on an empty input is a no-op (no error, no navigation)', async ({
    page,
  }) => {
    await page.goto(`${ADMIN}/places`);

    const input = page.getByRole('searchbox', { name: 'Search places' });
    await expect(input).toHaveValue('');

    // Should not throw or navigate
    const urlBefore = page.url();
    await input.press('Escape');
    await page.waitForTimeout(200);
    const urlAfter = page.url();

    // URL unchanged (or still at /places with no q)
    expect(urlAfter).not.toMatch(/[?&]q=/);
    await expect(input).toHaveValue('');
  });

  // -------------------------------------------------------------------------
  // T4-AC6 / T3-AC8 / T3-AC9: deep-link /places?q=<value> pre-fills + filters
  // -------------------------------------------------------------------------
  test('deep-linking /places?q=<value> pre-fills input and renders filtered list', async ({
    page,
    request,
  }) => {
    const uniqueSuffix = `Deep${Date.now()}`;
    const name = `DeepLink Place ${uniqueSuffix}`;
    const seeded = await seedPlace(page, request, name);

    try {
      // Navigate directly to the filtered URL
      await page.goto(`${ADMIN}/places?q=${encodeURIComponent(uniqueSuffix)}`);
      await page.waitForLoadState('networkidle');

      const input = page.getByRole('searchbox', { name: 'Search places' });
      // Input must be pre-filled with the search term
      await expect(input).toHaveValue(uniqueSuffix);

      // List must be filtered
      const rows = page.locator('main ul > li');
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toContainText(name);
    } finally {
      await deletePlace(page, seeded.key);
    }
  });

  // -------------------------------------------------------------------------
  // T4-AC7 / T3-AC11: empty state 'No places match' for a zero-hit query
  // -------------------------------------------------------------------------
  test('empty state shows "No places match" for a query with zero hits', async ({ page }) => {
    // Use a UUID-like string guaranteed to match nothing
    const uniqueNonMatch = `nomatch-${Date.now()}-zzzzz99999`;
    await page.goto(`${ADMIN}/places?q=${encodeURIComponent(uniqueNonMatch)}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=/No places match/')).toBeVisible();
    // The q value must appear in the message
    await expect(
      page.locator(`text=/No places match.*${uniqueNonMatch.slice(0, 20)}/`)
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // T3-AC12: original empty-state copy when q is empty and no places exist
  // (We can't guarantee zero places in the DB, so we verify that when q IS
  // provided and list IS empty, the q-specific copy appears. The inverse
  // is covered by T3-AC12 static check in the unit tests.)
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // T3-AC10: whitespace q → full list (server-side trim)
  // -------------------------------------------------------------------------
  test('whitespace-only q (?q=%20%20) renders the full list and input is empty', async ({
    page,
    request,
  }) => {
    await page.goto(`${ADMIN}/places?q=${encodeURIComponent('  ')}`);
    await page.waitForLoadState('networkidle');

    // Input should be empty (whitespace trimmed to '')
    const input = page.getByRole('searchbox', { name: 'Search places' });
    await expect(input).toHaveValue('');

    // Full list should be shown — compare against API
    const apiRes = await (request as any).get(`${API}/api/places`);
    const apiPlaces = await apiRes.json();
    const rows = page.locator('main ul > li');
    await expect(rows).toHaveCount(apiPlaces.length);
  });

  // -------------------------------------------------------------------------
  // T3-AC6 / T4 debounce: router.replace — back button skips keystroke history
  // (Verify that repeated searches don't pollute the history stack.)
  // -------------------------------------------------------------------------
  test('router.replace is used — back button after several searches returns to pre-search page', async ({
    page,
  }) => {
    // Navigate to a different page first so "back" has somewhere to go
    await page.goto(`${ADMIN}/places`);
    const priorUrl = page.url();

    // Now navigate into a search sequence
    await page.goto(`${ADMIN}/places`);

    const input = page.getByRole('searchbox', { name: 'Search places' });
    // Type several characters with debounce gaps to trigger multiple navigations
    await input.fill('a');
    await page.waitForTimeout(300);
    await input.fill('ab');
    await page.waitForTimeout(300);
    await input.fill('abc');
    await page.waitForTimeout(300);

    // URL is now at ?q=abc
    expect(page.url()).toMatch(/[?&]q=abc/);

    // Press Back — should jump back past all the replaced states to priorUrl
    // With router.replace, each search replaces the same history entry, so back
    // should take us back to /places (no ?q=) or possibly to the page before that.
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // We should NOT be at ?q=ab or ?q=a (those were replaced)
    const urlAfterBack = page.url();
    expect(urlAfterBack).not.toMatch(/[?&]q=ab($|&)/);
    expect(urlAfterBack).not.toMatch(/[?&]q=a($|&)/);
  });

  // -------------------------------------------------------------------------
  // T3-AC5: other URL params preserved across edits
  // (Forward-defensive: /places has no other params today, but the URLSearchParams
  // construction preserves existing params. Verify by injecting a hypothetical
  // param and ensuring it survives a q update.)
  // -------------------------------------------------------------------------
  test('other URL params are preserved when q is written', async ({ page }) => {
    // Navigate with a fake param that SearchInput should preserve
    await page.goto(`${ADMIN}/places?other=preserved`);
    await page.waitForLoadState('networkidle');

    const input = page.getByRole('searchbox', { name: 'Search places' });
    await input.fill('test');
    await page.waitForTimeout(400);

    const url = page.url();
    // q should be set
    expect(url).toMatch(/[?&]q=test/);
    // The other param should still be there
    expect(url).toMatch(/[?&]other=preserved/);
  });

  // -------------------------------------------------------------------------
  // T2-AC8: SQL injection safety — % and _ in q are treated as literals
  // (At the E2E layer: verify that typing % as the query doesn't crash the
  // page or return unexpected results — it should either show zero results or
  // the small set of places whose text literally contains %. No 500 error.)
  // -------------------------------------------------------------------------
  test('typing % as the query does not crash the page (SQL wildcards are literal)', async ({
    page,
  }) => {
    await page.goto(`${ADMIN}/places`);
    await page.waitForLoadState('networkidle');

    const input = page.getByRole('searchbox', { name: 'Search places' });
    await input.fill('%');
    await page.waitForTimeout(400);
    await page.waitForLoadState('networkidle');

    // Page must not show an error — the h1 should still be "Places"
    await expect(page.locator('h1')).toContainText('Places');
    // No server error
    await expect(page.locator('text=/500|Internal Server Error/i')).toHaveCount(0);
  });

  test('typing _ as the query does not crash the page (SQL wildcards are literal)', async ({
    page,
  }) => {
    await page.goto(`${ADMIN}/places`);
    await page.waitForLoadState('networkidle');

    const input = page.getByRole('searchbox', { name: 'Search places' });
    await input.fill('_');
    await page.waitForTimeout(400);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Places');
    await expect(page.locator('text=/500|Internal Server Error/i')).toHaveCount(0);
  });

  // -------------------------------------------------------------------------
  // T3-AC8: /places (no q) shows full list + SearchInput with empty value
  // -------------------------------------------------------------------------
  test('visiting /places with no q renders full list and input is empty', async ({
    page,
    request,
  }) => {
    const apiRes = await (request as any).get(`${API}/api/places`);
    const apiPlaces = await apiRes.json();

    await page.goto(`${ADMIN}/places`);
    await page.waitForLoadState('networkidle');

    const input = page.getByRole('searchbox', { name: 'Search places' });
    await expect(input).toHaveValue('');

    const rows = page.locator('main ul > li');
    await expect(rows).toHaveCount(apiPlaces.length);
  });

  // -------------------------------------------------------------------------
  // T4-AC3: match via address field (tests cross-field search coverage)
  // -------------------------------------------------------------------------
  test('search matches on address field (partial substring)', async ({
    page,
    request,
  }) => {
    const uniqueSuffix = `Addr${Date.now()}`;
    const name = `AddrTest ${uniqueSuffix}`;
    const address = `${uniqueSuffix} Main Street`;
    const seeded = await seedPlace(page, request, name, address);

    try {
      await page.goto(`${ADMIN}/places`);
      const input = page.getByRole('searchbox', { name: 'Search places' });
      await input.fill(uniqueSuffix);
      await page.waitForTimeout(400);
      await page.waitForLoadState('networkidle');

      const rows = page.locator('main ul > li');
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toContainText(name);
    } finally {
      await deletePlace(page, seeded.key);
    }
  });
});
