import {Page} from "@playwright/test";

export const goToAdminPage = async (page: Page) => {

}


export const loginToAdmin = async (page: Page, username: string, password: string) => {
    const maxAttempts = 10;
    let currentAttempt = 0;
    let success = false;

    while (!success && currentAttempt < maxAttempts) {
        try {
            await page.goto('http://localhost:9001/admin');
            success = true; // If the page loads successfully, set success to true
        } catch (error) {
                currentAttempt++;
        }
    }
    await page.waitForSelector('input[name="username"]');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('input[type="button"]');
}


export const saveSettings = async (page: Page) => {
    // Click save
    await page.locator('.settings-button-bar').locator('button').first().click()
    await page.waitForSelector('.ToastRootSuccess')
}

export const restartEtherpad = async (page: Page) => {
    // Click restart
    await page.locator('.settings-button-bar').locator('button').nth(1).click()
    await page.waitForTimeout(100)
    await page.waitForSelector('.settings')
}
