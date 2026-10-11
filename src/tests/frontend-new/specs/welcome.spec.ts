import {type Page, type Route, test, expect} from '@playwright/test';

// English text of index.sessionTransferError. The error elements are
// localized via data-l10n-id; server-supplied error strings must never be
// shown because they are not translated.
const localizedError = 'Unable to transfer the session. Please try again.';
const validCode = '550e8400-e29b-41d4-a716-446655440000';
const otherValidCode = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

const transferNow = (page: Page) => page.locator('[data-l10n-id="index.transferSessionNow"]');

const openSettingsDialog = async (page: Page) => {
  await page.locator('.settings-button').click();
  const dialog = page.locator('#settings-dialog');
  await expect(dialog).toBeVisible();
  return dialog;
};

const openReceiveSession = async (page: Page) => {
  await openSettingsDialog(page);
  await page.locator('#button-bar button[data-l10n-id="index.receiveSessionTitle"]').click();
};

const closeDialogViaBackdrop = async (page: Page) => {
  const dialog = page.locator('#settings-dialog');
  await dialog.evaluate((el) => (el as HTMLElement).click());
  await expect(dialog).not.toBeVisible();
};

const fulfillJson = (status: number, body: unknown) => async (route: Route) => {
  await route.fulfill({status, contentType: 'application/json', body: JSON.stringify(body)});
};

// Holds a routed request until release() is called. `entered` resolves once
// the browser has actually issued the request, so tests can act while it is
// in flight without racing the route handler.
const holdRoute = async (page: Page, url: string, status: number, body: unknown) => {
  let release!: () => void;
  const released = new Promise<void>((resolve) => { release = resolve; });
  let markEntered!: () => void;
  const entered = new Promise<void>((resolve) => { markEntered = resolve; });
  await page.route(url, async (route) => {
    markEntered();
    await released;
    await fulfillJson(status, body)(route);
  });
  return {entered, release};
};

const mockClipboard = async (page: Page) => {
  await page.evaluate(() => {
    (window as any).clipboardData = '';
    navigator.clipboard.writeText = async (text: string) => {
      (window as any).clipboardData = text;
    };
  });
};

test.describe('Session Transfer Functionality', () => {
  test.beforeEach(async ({page, context}) => {
    await context.addCookies([
      {name: 'token', value: 'test-token-123', domain: 'localhost', path: '/'},
      {name: 'prefsHttp', value: 'test-prefs', domain: 'localhost', path: '/'},
    ]);
    await page.goto('localhost:9001/');
  });

  test.describe('creating a transfer code', () => {
    test('should open settings dialog and transfer session', async ({page}) => {
      await page.route('**/tokenTransfer', fulfillJson(200, {id: validCode}));
      await openSettingsDialog(page);

      const transferButton = transferNow(page);
      await expect(transferButton).toBeVisible();
      await transferButton.click();

      await expect(transferButton).toBeDisabled();
      await expect(transferButton.locator('svg')).toBeVisible();
      await expect(page.locator('#copy-link-section')).toBeVisible();
      await expect(page.locator('#copy-link-section .btn-secondary')).toBeVisible();
      await expect(page.locator('#transfer-session-error')).toBeHidden();
    });

    test('should copy transfer ID to clipboard', async ({page}) => {
      await page.route('**/tokenTransfer', fulfillJson(200, {id: validCode}));
      await openSettingsDialog(page);
      await transferNow(page).click();

      const copyButton = page.locator('#copy-link-section .btn-secondary');
      await expect(copyButton).toBeVisible();
      await mockClipboard(page);
      await copyButton.click();

      await expect(copyButton).toBeDisabled();
      await expect(copyButton.locator('svg')).toBeVisible();
      expect(await page.evaluate(() => (window as any).clipboardData)).toBe(validCode);
    });

    test('should show a localized error and stay usable after a 400 response', async ({page}) => {
      await page.route('**/tokenTransfer',
          fulfillJson(400, {error: 'No author cookie to transfer'}));
      await openSettingsDialog(page);
      const transferButton = transferNow(page);
      await transferButton.click();

      const error = page.locator('#transfer-session-error');
      await expect(error).toBeVisible();
      await expect(error).toHaveText(localizedError);
      await expect(page.locator('#copy-link-section')).toBeHidden();
      await expect(transferButton).not.toBeDisabled();
      await expect(transferButton.locator('svg')).toHaveCount(0);
      await expect(transferButton).toHaveText('Create transfer code');
    });

    test('should never render server-supplied error content', async ({page}) => {
      const serverError = '<img src=x onerror="window.sessionTransferXss = true">Token failed';
      await page.route('**/tokenTransfer', fulfillJson(400, {error: serverError}));
      await openSettingsDialog(page);
      await transferNow(page).click();

      const error = page.locator('#transfer-session-error');
      await expect(error).toHaveText(localizedError);
      await expect(error.locator('img')).toHaveCount(0);
      expect(await page.evaluate(() => (window as any).sessionTransferXss)).toBeUndefined();
    });

    for (const [name, status, body] of [
      ['2xx without an id', 200, {ok: true}],
      ['2xx with an invalid id', 200, {id: 'not-a-valid-transfer-id'}],
      ['non-2xx with an id', 500, {id: validCode}],
    ] as const) {
      test(`should treat a create response ${name} as a failure`, async ({page}) => {
        await page.route('**/tokenTransfer', fulfillJson(status, body));
        await openSettingsDialog(page);
        const transferButton = transferNow(page);
        await transferButton.click();

        await expect(page.locator('#transfer-session-error')).toHaveText(localizedError);
        await expect(page.locator('#copy-link-section')).toBeHidden();
        await expect(transferButton).not.toBeDisabled();
      });
    }

    test('should treat a non-JSON create response as a failure', async ({page}) => {
      await page.route('**/tokenTransfer', async (route) => {
        await route.fulfill({status: 200, contentType: 'text/plain', body: 'not-json'});
      });
      await openSettingsDialog(page);
      const transferButton = transferNow(page);
      await transferButton.click();

      await expect(page.locator('#transfer-session-error')).toHaveText(localizedError);
      await expect(page.locator('#copy-link-section')).toBeHidden();
      await expect(transferButton).not.toBeDisabled();
    });

    test('should not expose copy state after a network failure', async ({page}) => {
      await page.route('**/tokenTransfer', async (route) => route.abort());
      await openSettingsDialog(page);
      const transferButton = transferNow(page);
      await transferButton.click();

      await expect(page.locator('#transfer-session-error')).toHaveText(localizedError);
      await expect(page.locator('#copy-link-section')).toBeHidden();
      await expect(transferButton).not.toBeDisabled();
    });

    test('should hide a previous error when retrying succeeds', async ({page}) => {
      let calls = 0;
      await page.route('**/tokenTransfer', async (route) => {
        calls++;
        await fulfillJson(calls === 1 ? 500 : 200, calls === 1 ? {} : {id: validCode})(route);
      });
      await openSettingsDialog(page);
      const transferButton = transferNow(page);
      await transferButton.click();
      await expect(page.locator('#transfer-session-error')).toBeVisible();

      await transferButton.click();
      await expect(page.locator('#copy-link-section')).toBeVisible();
      await expect(page.locator('#transfer-session-error')).toBeHidden();
    });

    test('should keep the transfer code if the dialog is closed mid-request', async ({page}) => {
      const {entered, release} = await holdRoute(page, '**/tokenTransfer', 200, {id: validCode});
      await openSettingsDialog(page);
      await transferNow(page).click();
      await entered;

      await closeDialogViaBackdrop(page);
      release();
      await expect(page.locator('#copy-link-section')).toHaveCSS('display', 'block');

      await openSettingsDialog(page);
      const copyButton = page.locator('#copy-link-section .btn-secondary');
      await expect(copyButton).toBeVisible();
      await expect(transferNow(page)).toBeDisabled();
      await mockClipboard(page);
      await copyButton.click();
      expect(await page.evaluate(() => (window as any).clipboardData)).toBe(validCode);
    });
  });

  test.describe('redeeming a transfer code', () => {
    test('should receive session with valid code', async ({page}) => {
      await page.route(`**/tokenTransfer/${validCode}`, fulfillJson(200, {ok: true}));
      await openReceiveSession(page);

      await expect(page.locator('#transfer-to-system-section')).toBeVisible();
      const codeInput = page.locator('#codeInput');
      await expect(codeInput).toBeVisible();
      const transferButton = page.locator('#transferSessionButton');
      await expect(transferButton).toBeDisabled();

      await codeInput.fill(validCode);
      await expect(transferButton).not.toBeDisabled();

      await Promise.all([
        page.waitForNavigation(),
        transferButton.click(),
      ]);
    });

    for (const [name, status, body] of [
      ['a missing transfer id (404)', 404, {error: 'Token not found'}],
      ['an expired transfer id (410)', 410, {error: 'Token expired'}],
      ['a 2xx response without ok:true', 200, {ok: false}],
    ] as const) {
      test(`should not reload and should preserve code after ${name}`, async ({page}) => {
        let navigated = false;
        page.on('framenavigated', () => { navigated = true; });
        await page.route(`**/tokenTransfer/${validCode}`, fulfillJson(status, body));
        await openReceiveSession(page);

        const codeInput = page.locator('#codeInput');
        const transferButton = page.locator('#transferSessionButton');
        await codeInput.fill(validCode);
        await transferButton.click();

        const error = page.locator('#receive-session-error');
        await expect(error).toBeVisible();
        await expect(error).toHaveText(localizedError);
        await expect(page.locator('#settings-dialog')).toBeVisible();
        await expect(codeInput).toHaveValue(validCode);
        await expect(transferButton).not.toBeDisabled();
        expect(navigated).toBe(false);
      });
    }

    test('should not reload when receive response is not valid JSON', async ({page}) => {
      await page.route(`**/tokenTransfer/${validCode}`, async (route) => {
        await route.fulfill({status: 200, contentType: 'text/plain', body: 'not-json'});
      });
      await openReceiveSession(page);

      const codeInput = page.locator('#codeInput');
      const transferButton = page.locator('#transferSessionButton');
      await codeInput.fill(validCode);
      await transferButton.click();

      await expect(page.locator('#receive-session-error')).toHaveText(localizedError);
      await expect(page.locator('#settings-dialog')).toBeVisible();
      await expect(codeInput).toHaveValue(validCode);
      await expect(transferButton).not.toBeDisabled();
    });

    test('should not reload after a network failure', async ({page}) => {
      await page.route(`**/tokenTransfer/${validCode}`, async (route) => route.abort());
      await openReceiveSession(page);

      const codeInput = page.locator('#codeInput');
      const transferButton = page.locator('#transferSessionButton');
      await codeInput.fill(validCode);
      await transferButton.click();

      await expect(page.locator('#receive-session-error')).toHaveText(localizedError);
      await expect(codeInput).toHaveValue(validCode);
      await expect(transferButton).not.toBeDisabled();
    });

    test('should hide the error when the code is edited', async ({page}) => {
      await page.route(`**/tokenTransfer/${validCode}`, fulfillJson(404, {error: 'x'}));
      await openReceiveSession(page);

      const codeInput = page.locator('#codeInput');
      await codeInput.fill(validCode);
      await page.locator('#transferSessionButton').click();
      await expect(page.locator('#receive-session-error')).toBeVisible();

      await codeInput.fill(otherValidCode);
      await expect(page.locator('#receive-session-error')).toBeHidden();
    });

    test('should keep transfer button disabled for invalid codes', async ({page}) => {
      await openReceiveSession(page);
      const codeInput = page.locator('#codeInput');
      const transferButton = page.locator('#transferSessionButton');

      await codeInput.fill('short-code');
      await expect(transferButton).toBeDisabled();
      await codeInput.fill('12345678-1234-5678-1234-567812345678-extra');
      await expect(transferButton).toBeDisabled();
      // Right length and shape, but not hex.
      await codeInput.fill('zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz');
      await expect(transferButton).toBeDisabled();
      await codeInput.fill('');
      await expect(transferButton).toBeDisabled();
    });

    test('should disable the button when the code becomes invalid during a failed request',
        async ({page}) => {
          const {entered, release} =
              await holdRoute(page, `**/tokenTransfer/${validCode}`, 404, {error: 'Token not found'});
          await openReceiveSession(page);

          const codeInput = page.locator('#codeInput');
          const transferButton = page.locator('#transferSessionButton');
          await codeInput.fill(validCode);
          await expect(transferButton).not.toBeDisabled();
          await transferButton.click();
          await entered;

          await codeInput.fill('invalid-code');
          release();

          await expect(page.locator('#receive-session-error')).toHaveText(localizedError);
          await expect(transferButton).toBeDisabled();
        });

    test('should not allow a second redemption while one is pending', async ({page}) => {
      let requests = 0;
      page.on('request', (req) => {
        if (/\/tokenTransfer\//.test(req.url())) requests++;
      });
      const {entered, release} =
          await holdRoute(page, `**/tokenTransfer/${validCode}`, 404, {error: 'Token not found'});
      await openReceiveSession(page);

      const codeInput = page.locator('#codeInput');
      const transferButton = page.locator('#transferSessionButton');
      await codeInput.fill(validCode);
      await transferButton.click();
      await entered;

      // Typing another valid code must not re-enable the button mid-request.
      await codeInput.fill(otherValidCode);
      await expect(transferButton).toBeDisabled();

      release();
      await expect(page.locator('#receive-session-error')).toHaveText(localizedError);
      // Once the request settles, the button reflects the current (valid) input.
      await expect(transferButton).not.toBeDisabled();
      expect(requests).toBe(1);
    });
  });

  test.describe('settings dialog', () => {
    test('should switch between tabs in settings dialog', async ({page}) => {
      await openSettingsDialog(page);
      const transferTab = page.locator('#button-bar button[data-l10n-id="index.transferSessionTitle"]');
      const receiveTab = page.locator('#button-bar button[data-l10n-id="index.receiveSessionTitle"]');

      await expect(transferTab).toHaveClass(/active-btn/);
      await receiveTab.click();
      await expect(receiveTab).toHaveClass(/active-btn/);
      await expect(transferTab).not.toHaveClass(/active-btn/);
      await expect(page.locator('#transfer-to-system-section')).toBeVisible();

      await transferTab.click();
      await expect(transferTab).toHaveClass(/active-btn/);
    });

    test('should close dialog when clicking outside', async ({page}) => {
      await openSettingsDialog(page);
      await closeDialogViaBackdrop(page);
    });
  });
});
