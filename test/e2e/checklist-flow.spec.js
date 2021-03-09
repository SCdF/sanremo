import { newChecklist } from './po/home';

beforeAll(async () => {
  await page.goto('http://localhost:3000/');
  // TWICE: so the fake intro data is setup. To be removed once we can create templates in flow
  await page.goto('http://localhost:3000/');
})

test('Create a new checklist instance and complete it', async () => {
  await newChecklist('Wrist Stretches');
  const title = await page.isVisible('h6:has-text("Wrist Stretches")');
  expect(title).toBeTruthy();
})
