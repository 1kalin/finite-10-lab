import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--remote-debugging-port=0',
  '--user-data-dir=/tmp/finite10-responsive-test',
  'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });

let socket;
let nextId = 0;
const pending = new Map();

function command(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

try {
  const endpoint = await new Promise((resolve, reject) => {
    let stderr = '';
    const timer = setTimeout(() => reject(new Error('Chrome did not expose a debug endpoint')), 10000);
    chrome.stderr.on('data', chunk => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    chrome.once('exit', code => reject(new Error(`Chrome exited early (${code})`)));
  });

  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const handler = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) handler.reject(new Error(message.error.message));
    else handler.resolve(message.result);
  });

  const target = await command('Target.createTarget', { url: 'about:blank' });
  const attached = await command('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const sessionId = attached.sessionId;
  const send = (method, params = {}) => {
    const id = ++nextId;
    socket.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  };

  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await send('Page.navigate', { url: pathToFileURL(path.join(root, 'dist/index.html')).href });
  await new Promise(resolve => setTimeout(resolve, 500));
  const result = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: Array.from(document.querySelectorAll('body *')).filter(function (element) {
        var rect = element.getBoundingClientRect();
        return rect.left < -0.5 || rect.right > document.documentElement.clientWidth + 0.5;
      }).map(function (element) { return element.className || element.tagName; })
    })`,
    returnByValue: true
  });
  const metrics = JSON.parse(result.result.value);
  assert.equal(metrics.viewport, 390);
  assert.equal(metrics.scrollWidth, metrics.viewport, `horizontal overflow: ${JSON.stringify(metrics)}`);
  assert.deepEqual(metrics.offenders, [], `elements outside viewport: ${JSON.stringify(metrics.offenders)}`);
  if (process.env.RESPONSIVE_SCREENSHOT) {
    const screenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    await writeFile(process.env.RESPONSIVE_SCREENSHOT, screenshot.data, 'base64');
  }
  console.log('responsive check passed at 390x844');
} finally {
  if (socket) socket.close();
  chrome.kill('SIGTERM');
}
