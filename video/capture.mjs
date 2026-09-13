import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, '.video-tools/package.json'));
const { chromium } = require('playwright-core');
const [target, outputArg, secondsArg = '20', actionsPath] = process.argv.slice(2);
if (!target || !outputArg) throw new Error('Usage: node video/capture.mjs HTTPS_URL video/captures/name [seconds]');
const url = new URL(target);
if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use a public HTTP(S) URL without credentials.');
const output = resolve(root, outputArg);
if (relative(root, output).startsWith('..') || output.includes("'")) throw new Error('Output must be inside this repository without apostrophes.');
const seconds = Number(secondsArg);
if (!Number.isFinite(seconds) || seconds < 2 || seconds > 240) throw new Error('Duration must be 2–240 seconds.');
const actions = actionsPath ? JSON.parse(await readFile(resolve(root, actionsPath), 'utf8')) : [];
if (!Array.isArray(actions) || actions.some(action => !Number.isFinite(action.at_seconds) || action.at_seconds < 0 || action.at_seconds >= seconds || typeof action.name !== 'string' || (action.kind === 'fill' && typeof action.value !== 'string'))) throw new Error('Actions require an in-range at_seconds and exact accessible name; fill actions also require value.');
actions.sort((first, second) => first.at_seconds - second.at_seconds);
await mkdir(output, { recursive: true });
const frames = resolve(output, 'frames');
await mkdir(frames, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
let manifest;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const response = await page.goto(target, { waitUntil: 'networkidle', timeout: 45000 });
  if (!response || !response.ok()) throw new Error(`Navigation failed: ${response?.status()}`);
  await page.screenshot({ path: resolve(output, 'screenshot.png') });
  const started = Date.now();
  const timestamps = [];
  const performedActions = [];
  while (Date.now() - started < seconds * 1000) {
    while (actions.length && actions[0].at_seconds <= (Date.now() - started) / 1000) {
      const action = actions.shift();
      if (action.kind === 'fill') {
        await page.getByRole('textbox', { name: action.name, exact: true }).fill(action.value, { timeout: 5000 });
      } else {
        await page.getByRole('button', { name: action.name, exact: true }).click({ timeout: 5000 });
      }
      performedActions.push({ ...action, performed_at_seconds: (Date.now() - started) / 1000 });
    }
    const frame = `frame-${String(timestamps.length).padStart(5, '0')}.png`;
    timestamps.push({ file: frame, time: (Date.now() - started) / 1000 });
    await page.screenshot({ path: resolve(frames, frame) });
    await new Promise(done => setTimeout(done, Math.max(0, 1000 - (Date.now() - started - timestamps.at(-1).time * 1000))));
  }
  const duration = (Date.now() - started) / 1000;
  const timeline = timestamps.map((frame, index) => `file 'frames/${frame.file}'\nduration ${(timestamps[index + 1]?.time ?? duration) - frame.time}`).join('\n');
  await writeFile(resolve(output, 'frames.txt'), `${timeline}\nfile 'frames/${timestamps.at(-1).file}'\n`);
  const encoded = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-f', 'concat', '-safe', '0', '-i', resolve(output, 'frames.txt'), '-t', String(duration), '-r', '30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-an', resolve(output, 'capture.mp4')], { stdio: 'inherit' });
  if (encoded.status !== 0) throw new Error('ffmpeg failed; choose a new output directory if a capture already exists.');
  manifest = { captured_at: new Date(started).toISOString(), requested_url: target, final_url: page.url(), http_status: response.status(), title: await page.title(), width: 1280, height: 720, duration_seconds: duration, actions: performedActions, method: 'Actual browser screenshots at approximately 1 Hz, encoded using elapsed wall-clock intervals; no UI replacement or time acceleration. Optional actions click actual named buttons.', audio: 'none; NOT a completed submission video', limitations: 'Browser pixels and performed actions are recorded; backend execution requires the accompanying API/provider evidence. This capture alone does not prove training or deployment.', video_sha256: createHash('sha256').update(await readFile(resolve(output, 'capture.mp4'))).digest('hex') };
  await writeFile(resolve(output, 'capture.json'), JSON.stringify(manifest, null, 2) + '\n');
} finally {
  await browser.close();
}
console.log(JSON.stringify(manifest, null, 2));
