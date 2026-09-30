/** Both restored sessions and fresh authentication enter the signed-in shell. */
export async function openWorkspace(page) {
  await page.locator('.sidebar-2026').waitFor({ state: 'visible' });
}

export async function openNavigation(page) {
  if (await page.locator('#workspace-navigation-panel').count() === 0) {
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
  }
  await page.locator('#workspace-navigation-panel').waitFor({ state: 'visible' });
}

export async function selectWorkspaceTab(page, id) {
  await openNavigation(page);
  await page.locator(`[data-nav-id="${id}"]`).click();
  await page.locator('#workspace-navigation-panel').waitFor({ state: 'hidden' });
}
