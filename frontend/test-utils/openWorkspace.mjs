/** Authentication ends on the LAB landing; tests explicitly enter the workspace. */
export async function openWorkspace(page) {
  await page.waitForFunction(() => Boolean(
    document.querySelector('.public-account-actions button.public-login') ||
    document.querySelector('.sidebar-2026')
  ));
  if (await page.locator('.sidebar-2026').count() === 0) {
    await page.locator('.public-account-actions button.public-login').click();
  }
  await page.locator('.sidebar-2026').waitFor({ state: 'attached' });
}
