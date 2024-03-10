import {Page} from "@playwright/test";

export const goToAdminPage = async (page: Page) => {

}


export const loginToAdmin = async (page: Page, username: string, password: string) => {

    await page.goto('http://localhost:9001/admin/');

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
