export async function newChecklist(name) {
  await page.click(`a:has-text('${name}')`);
  await page.waitForSelector(`h6:has-text('${name}')`);
}
