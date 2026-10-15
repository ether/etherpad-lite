import {expect, test, Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {goToPad} from '../helper/padHelper';
import {showSettings} from '../helper/settingsHelper';

// goToNewPad() in the shared helper auto-dismisses the deletion-token modal
// so unrelated tests aren't blocked. These tests need the modal, so they
// navigate inline without the helper.
const newPadKeepingModal = async (page: Page) => {
  const padId = `FRONTEND_TESTS${randomUUID()}`;
  await page.goto(`http://localhost:9001/p/${padId}`);
  await page.waitForSelector('iframe[name="ace_outer"]');
  await page.waitForSelector('#editorcontainer.initialized');
  return padId;
};

test.describe('pad deletion token', () => {
  test.beforeEach(async ({context}) => {
    await context.clearCookies();
  });

  test('creator sees a token modal exactly once and can dismiss it', async ({page}) => {
    await newPadKeepingModal(page);
    const modal = page.locator('#deletiontoken-modal');
    await expect(modal).toBeVisible();

    const tokenValue = await page.locator('#deletiontoken-value').inputValue();
    expect(tokenValue.length).toBeGreaterThanOrEqual(32);

    await page.locator('#deletiontoken-ack').click();
    await expect(modal).toBeHidden();

    const cleared = await page.evaluate(
        () => (window as any).clientVars.padDeletionToken);
    expect(cleared == null).toBe(true);
  });

  test('second device can delete using the captured token', async ({page, browser}) => {
    const padId = await newPadKeepingModal(page);
    const token = await page.locator('#deletiontoken-value').inputValue();
    await page.locator('#deletiontoken-ack').click();

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await goToPad(page2, padId);
    await showSettings(page2);

    await page2.locator('#delete-pad-with-token > summary').click();
    await page2.locator('#delete-pad-token-input').fill(token);
    page2.once('dialog', (d) => d.accept());
    await page2.locator('#delete-pad-token-submit').click();

    await page2.waitForURL((url) => url.pathname === '/' || url.pathname.endsWith('/index.html'),
        {timeout: 10000});

    await context2.close();
  });

  test('creator pasting a wrong token into the disclosure field does not delete the pad',
      async ({page}) => {
    const padId = await newPadKeepingModal(page);
    await page.locator('#deletiontoken-ack').click();

    // Same browser context — the creator cookie/identity is still in place.
    // The bug we're guarding against: handler short-circuited on isCreator
    // and ignored a supplied-but-invalid token, so the pad was deleted anyway.
    await showSettings(page);
    await page.locator('#delete-pad-with-token > summary').click();
    await page.locator('#delete-pad-token-input').fill('definitely-not-the-real-token');
    const dialogs: string[] = [];
    page.on('dialog', async (d) => {
      dialogs.push(d.message());
      await d.accept();
    });
    await page.locator('#delete-pad-token-submit').click();

    await expect.poll(() => dialogs.length, {timeout: 10000}).toBeGreaterThanOrEqual(2);
    expect(dialogs.some((m) => /not valid for this pad/i.test(m))).toBe(true);
    // Regression guard: the global shout handler should NOT surface a
    // "Admin message" gritter for deletion-denial shouts, and certainly never
    // an "undefined" body.
    const gritterHits = await page.locator('.gritter-item').allInnerTexts();
    expect(gritterHits.join('\n')).not.toMatch(/Admin message/);
    expect(gritterHits.join('\n')).not.toMatch(/undefined/);

    // Pad must still exist — reload and verify the editor comes back.
    await page.goto(`http://localhost:9001/p/${padId}`);
    await expect(page.locator('#editorcontainer.initialized')).toBeVisible();
  });

  test('wrong token keeps the pad alive and surfaces a shout', async ({page, browser}) => {
    const padId = await newPadKeepingModal(page);
    await page.locator('#deletiontoken-ack').click();

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await goToPad(page2, padId);
    await showSettings(page2);

    await page2.locator('#delete-pad-with-token > summary').click();
    await page2.locator('#delete-pad-token-input').fill('bogus-token-value');
    const dialogs: string[] = [];
    page2.on('dialog', async (d) => {
      dialogs.push(d.message());
      await d.accept();
    });
    await page2.locator('#delete-pad-token-submit').click();

    await expect.poll(() => dialogs.length, {timeout: 10000}).toBeGreaterThanOrEqual(2);
    expect(dialogs.some((m) => /not valid for this pad/i.test(m))).toBe(true);

    await page.reload();
    await expect(page.locator('#editorcontainer.initialized')).toBeVisible();
    await context2.close();
  });
});

// suppressPadDeletionTokenModal (#7996). The CI server runs with it off, so
// these flip the flag in clientVars as it arrives, which is all the server
// setting does. The token itself is the real one the server issued.
test.describe('pad deletion token with the modal suppressed', () => {
  test.use({locale: 'en-US'});

  const newPadWithModalSuppressed = async (page: Page) => {
    await page.addInitScript(() => {
      let stored: unknown;
      Object.defineProperty(window, 'clientVars', {
        configurable: true,
        get() { return stored; },
        set(v) {
          if (v != null && typeof v === 'object') {
            (v as {suppressPadDeletionTokenModal?: boolean}).suppressPadDeletionTokenModal = true;
          }
          stored = v;
        },
      });
    });
    return await newPadKeepingModal(page);
  };

  test.beforeEach(async ({context}) => {
    await context.clearCookies();
  });

  const toggleRow = (page: Page) => page.locator('#delete-pad-token-reveal');
  const turnToggle = (page: Page) =>
    page.locator('label[for="delete-pad-token-toggle"]').click();

  test('no modal; the settings toggle shows and copies a working token, across reloads',
      async ({page, browser, browserName, context}) => {
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    }
    const padId = await newPadWithModalSuppressed(page);
    await expect(page.locator('#deletiontoken-modal')).toBeHidden();

    await showSettings(page);
    // A user setting like the others, not next to the delete buttons.
    await expect(page.locator('#user-settings-section #delete-pad-token-reveal')).toBeVisible();
    await expect(page.locator('label[for="delete-pad-token-toggle"]'))
        .toHaveText('Show and copy deletion token');
    const panel = page.locator('#delete-pad-token-reveal-panel');
    const value = page.locator('#delete-pad-token-reveal-value');
    await expect(panel).toBeHidden();

    await turnToggle(page);
    await expect(page.locator('#delete-pad-token-toggle')).toBeChecked();
    await expect(panel).toBeVisible();
    await expect(page.locator('#delete-pad-token-reveal-status')).toHaveText('Copied');
    await expect(panel.locator('p')).toHaveText(
        'This token is the only way to delete this pad if you lose your browser session ' +
        'or switch device. It is only kept in this browser, so save it somewhere safe.');
    const token = await value.inputValue();
    expect(token.length).toBeGreaterThanOrEqual(32);
    if (browserName === 'chromium') {
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(token);
    }

    await turnToggle(page);
    await expect(panel).toBeHidden();

    // The server only sends the token once; it is still offered after a reload.
    await page.reload();
    await page.waitForSelector('#editorcontainer.initialized');
    await showSettings(page);
    await turnToggle(page);
    await expect(value).toHaveValue(token);

    // The token shown is the real one: another browser can delete with it.
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await goToPad(page2, padId);
    await showSettings(page2);
    await expect(toggleRow(page2)).toBeHidden();
    await page2.locator('#delete-pad-with-token > summary').click();
    await page2.locator('#delete-pad-token-input').fill(token);
    page2.once('dialog', (d) => d.accept());
    await page2.locator('#delete-pad-token-submit').click();
    await page2.waitForURL((url) => url.pathname === '/' || url.pathname.endsWith('/index.html'),
        {timeout: 10000});
    await context2.close();

    // The creator's browser drops the saved token once the pad is deleted.
    await expect.poll(() => page.evaluate(
        (id) => localStorage.getItem(`padDeletionToken:${id}`), padId)).toBeNull();
  });

  test('not offered when the modal is not suppressed', async ({page}) => {
    await newPadKeepingModal(page);
    await page.locator('#deletiontoken-ack').click();
    await showSettings(page);
    await expect(toggleRow(page)).toBeHidden();
  });
});
