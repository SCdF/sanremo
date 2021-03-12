import { newChecklist} from './po/home';
import {check, isChecked, status} from './po/checklist';

beforeAll(async () => {
  await page.goto('http://localhost:3000/');
  // TWICE: so the fake intro data is setup. To be removed once we can create templates in flow
  await page.goto('http://localhost:3000/');
  // page.on('console', msg => console.log(msg.text()))
})

test('Create a new checklist instance and complete it', async () => {
  await newChecklist('Wrist Stretches');
  await page.isVisible('header *:has-text("Wrist Stretches")');
  const { total, checked: initialChecked} = await status();
  expect(initialChecked).toBe(0);

  // Check test
  await check(1);
  expect(await isChecked(1)).toBeTruthy();
  expect((await status()).checked).toBe(1);
  await check(1);
  expect(await isChecked(1)).not.toBeTruthy();

  // Check all
  for (let i = 1; i <= total; i++) {
    await check(i);
  }
  expect((await status()).checked).toBe(total);

  // Clicking complete puts us back on the main page
  await page.click('text=complete');
  await page.waitForSelector('header *:has-text("Checklists")');

  // We should see the entry in history
  await page.click('text=history');
  await page.waitForSelector('header *:has-text("History")');
  expect(page.url()).toMatch(/\/history$/);
  await page.waitForSelector('main ul a *:has-text("Wrist Stretches")');

  expect(await page.$eval('a', a => a.href))
    .toMatch(RegExp('/checklist/checklist:instance:'));
  expect(await page.$eval('a', a => a.innerText))
    .toMatch(/Wrist Stretches\s*less than a minute ago/);
})
