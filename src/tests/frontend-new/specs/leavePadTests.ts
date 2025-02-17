import { test, expect } from '@playwright/test';  // Assuming Playwright is being used
import { leavePad } from '../helper/padHelper';  // Import the exitPad function

test('should exit the pad and return to the homepage', async ({ page }) => {
    // Open a new pad (this can use helper.newPad() if it exists)
    await page.goto('http://localhost:9001/p/test-' + Date.now());  // Or use helper.newPad()

    // Ensure the page is loaded
    await page.waitForLoadState('domcontentloaded');

    // Click the exit button using the exitPad function
    await leavePad(page);

    // Verify that the page has navigated to the homepage
    await expect(page).toHaveURL('http://localhost:9001/');
});