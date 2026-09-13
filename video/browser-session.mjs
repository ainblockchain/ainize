import { chromium } from '../.video-tools/node_modules/playwright-core/index.mjs';
import { createInterface } from 'node:readline';
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const root = resolve(import.meta.dirname, '..');
const privateDir = resolve(root, '.video-tools/wallet-profile');
await mkdir(privateDir, { recursive: true, mode: 0o700 });
await chmod(privateDir, 0o700);
const setupPath = resolve(privateDir, 'setup.json');
let setup;
try { setup = JSON.parse(await readFile(setupPath, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const require = createRequire(resolve(root, 'integrations/ens/package.json'));
  const { Wallet } = require('ethers');
  setup = { password: randomBytes(24).toString('base64url'), mnemonic: Wallet.createRandom().mnemonic.phrase };
  await writeFile(setupPath, JSON.stringify(setup), { mode: 0o600 });
}
if (process.env.AINIZE_ENV_FILE) process.loadEnvFile(process.env.AINIZE_ENV_FILE);
const extension = resolve(root, '.video-tools/metamask');
const viewportWidth = Number(process.env.CAPTURE_WIDTH ?? 1280);
const desktopHeight = Number(process.env.CAPTURE_HEIGHT ?? 820);
if (!Number.isInteger(viewportWidth) || !Number.isInteger(desktopHeight) || viewportWidth < 1280 || desktopHeight < 820) throw new Error('Capture must be at least 1280 by 820');
const context = await chromium.launchPersistentContext(privateDir, {
  executablePath: process.env.CHROMIUM_PATH ?? '/home/ubuntu/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',
  headless: !process.env.DISPLAY, viewport: { width: viewportWidth, height: desktopHeight - 100 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--no-sandbox', '--window-position=0,0', `--window-size=${viewportWidth},${desktopHeight}`],
});
context.setDefaultTimeout(7000);
const lines = createInterface({ input: process.stdin });
console.log(JSON.stringify({ ready: true }));
for await (const line of lines) {
  try {
    const command = JSON.parse(line);
    const pages = context.pages();
    let page = pages[command.page ?? pages.length - 1];
    if (command.action === 'pages') {
      console.log(JSON.stringify(pages.map((item, index) => ({ index, url: item.url() }))));
      continue;
    }
    if (command.action === 'new') page = await context.newPage();
    if (command.action === 'new' || command.action === 'goto') await page.goto(command.url, { waitUntil: 'domcontentloaded' });
    if (command.action === 'click') await page.getByRole(command.role ?? 'button', { name: command.name, exact: command.exact ?? true }).click();
    if (command.action === 'selector-click') await page.locator(command.selector).click();
    if (command.action === 'focus') await page.bringToFront();
    if (command.action === 'reveal') await page.locator(command.selector).scrollIntoViewIfNeeded();
    if (command.action === 'scroll') await page.mouse.wheel(0, command.distance ?? 400);
    if (command.action === 'fill') await page.locator(command.selector).fill(command.value);
    if (command.action === 'press') await page.locator(command.selector).press(command.key);
    if (command.action === 'secret') {
      const value = command.key === 'password' ? setup.password : command.key === 'mnemonic' ? setup.mnemonic : command.key === 'word' ? setup.mnemonic.split(' ')[command.word] : process.env[command.key];
      if (!value) throw new Error('Secret not configured');
      if (command.type) await page.locator(command.selector).pressSequentially(value, { delay: 20 });
      else await page.locator(command.selector).fill(value);
    }
    if (command.action === 'snapshot') console.log((await page.locator('body').innerText()).slice(0, 14000));
    if (command.action === 'inputs') {
      const inputs = await page.locator('input, textarea').all();
      console.log(JSON.stringify(await Promise.all(inputs.map(async input => ({ type: await input.getAttribute('type'), id: await input.getAttribute('id'), placeholder: await input.getAttribute('placeholder'), testid: await input.getAttribute('data-testid') })))));
    }
    if (command.action === 'screenshot') await page.screenshot({ path: resolve(root, command.path) });
    if (command.action === 'close') { await context.close(); break; }
    console.log(JSON.stringify({ ok: true, action: command.action }));
  } catch (error) {
    console.log(JSON.stringify({ ok: false, error: error.message?.split('\n')[0] ?? 'Browser action failed' }));
  }
}
await context.close();
