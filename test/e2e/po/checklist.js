export async function check(idx) {
  await page.click(`:nth-match(main > ul > div[role=button], ${idx})`);
}

export async function isChecked(idx) {
  return page.$eval(
    `:nth-match(main > ul input[type=checkbox], ${idx})`,
    node => node.checked);
}

export async function status() {
  const checked = await page.$$eval(
    'main > ul input[type=checkbox]',
    (inputs) => inputs.map(i => i.checked));

  return {
    total: checked.length,
    checked: checked.filter(b => !!b).length,
    unchecked: checked.filter(b => !!!b).length,
    items: checked
  };
}
