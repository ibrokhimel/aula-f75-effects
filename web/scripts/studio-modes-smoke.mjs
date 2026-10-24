import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: process.env.STUDIO_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium') });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.STUDIO_URL || 'http://127.0.0.1:3000/studio', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('.studio[data-ready="true"]').waitFor();
  const panel = page.locator('#studio-extra-panel');
  const stage = panel.locator('.studio-preview-stage canvas');
  const snapshot = () => stage.evaluate(canvas => canvas.toDataURL());
  const choose = async name => {
    await page.getByRole('tab', { name, exact: true }).click();
    await panel.waitFor(); await page.waitForTimeout(100);
  };
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('aula-f75.studio.modes.v1')));
  const color = async (locator, value) => locator.evaluate((input, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, next);
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);

  // Typing input is deliberately scoped: editing a search field never creates a press.
  await choose('Typing');
  const typingSearch = panel.getByLabel('Search typing effects', { exact: true });
  await typingSearch.fill('ripples'); await typingSearch.press('Backspace');
  assert.equal(await typingSearch.inputValue(), 'ripple');
  assert.equal(await panel.locator('.studio-typing-pad .studio-section-heading > span').innerText(), '0 key presses');
  await typingSearch.fill('');
  await panel.getByRole('button', { name: 'Preview Key glow', exact: true }).click();
  const typingControls = panel.getByRole('complementary', { name: 'Typing controls' });
  await typingControls.getByLabel('Release fade', { exact: true }).press('End');
  const idleTyping = await snapshot();
  const pad = panel.getByLabel('Typing test pad', { exact: true });
  await pad.focus(); await page.keyboard.down('f'); await page.waitForTimeout(100);
  const heldTyping = await snapshot(); assert.notEqual(heldTyping, idleTyping);
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.waitForTimeout(250);
  assert.notEqual(await snapshot(), heldTyping, 'Blur must release held keys');
  await page.keyboard.up('f');
  await panel.getByRole('button', { name: 'Key G', exact: true }).click();
  assert.equal(await panel.locator('.studio-typing-pad .studio-section-heading > span').innerText(), '2 key presses');
  await typingControls.getByLabel('Version', { exact: true }).selectOption('pulse');
  assert.equal(await typingControls.getByLabel('Release fade', { exact: true }).count(), 0);
  assert.ok(await typingControls.getByLabel('Pulse duration', { exact: true }).count());
  await page.getByRole('button', { name: 'Pause preview', exact: true }).click(); await page.waitForTimeout(100);
  const frozenTyping = await snapshot(); await pad.fill('native text'); await pad.press('Backspace');
  assert.equal(await pad.inputValue(), 'native tex'); await page.waitForTimeout(150); assert.equal(await snapshot(), frozenTyping);
  await page.getByRole('button', { name: 'Play preview', exact: true }).click();

  // Real MediaStreams exercise Web Audio and video sampling without opening OS pickers.
  await page.evaluate(() => {
    window.__captureMode = 'deny'; window.__testTracks = [];
    async function stream(audio, audioOnly = false) {
      if (window.__captureMode === 'deny') throw new DOMException('Denied for test', 'NotAllowedError');
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
      const context = canvas.getContext('2d'); let n = 0;
      const draw = () => { context.fillStyle = n++ % 2 ? '#ef784d' : '#4d86ef'; context.fillRect(0, 0, 320, 180); context.fillStyle = '#5bd8bd'; context.fillRect(160, 0, 160, 180); };
      draw(); const timer = setInterval(draw, 100); const video = audioOnly ? null : canvas.captureStream(15);
      let audioContext;
      const tracks = video ? [...video.getVideoTracks()] : [];
      if (audio && window.__captureMode !== 'no-audio') {
        audioContext = new AudioContext(); const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), destination = audioContext.createMediaStreamDestination();
        oscillator.frequency.value = 267.3; gain.gain.value = 0.35; oscillator.connect(gain).connect(destination); oscillator.start();
        tracks.push(...destination.stream.getAudioTracks());
      }
      let cleaned = false;
      for (const track of tracks) {
        const stop = track.stop.bind(track);
        track.stop = () => { stop(); if (!cleaned) { cleaned = true; clearInterval(timer); void audioContext?.close(); } };
        window.__testTracks.push(track);
      }
      const output = new MediaStream(tracks);
      if (window.__captureMode === 'delayed') await new Promise(resolve => { window.__releaseCapture = resolve; });
      return output;
    }
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getDisplayMedia: options => stream(!!options.audio), getUserMedia: () => stream(true, true) } });
  });
  await choose('Audio');
  const audioControls = panel.getByRole('complementary', { name: 'Audio controls' });
  await panel.getByRole('button', { name: 'Preview Waveform', exact: true }).click();
  assert.ok(await audioControls.getByLabel('Trace width', { exact: true }).count());
  assert.equal(await audioControls.getByLabel('Frequency bands', { exact: true }).count(), 0);
  await panel.getByLabel('Audio input', { exact: true }).selectOption('system');
  await panel.getByRole('button', { name: 'Start capture', exact: true }).click();
  await panel.getByText('Capture wasn’t started. Choose a source when you’re ready.', { exact: true }).waitFor();
  await page.evaluate(() => { window.__captureMode = 'no-audio'; });
  await panel.getByRole('button', { name: 'Start capture', exact: true }).click();
  await panel.getByText(/No audio was shared/).waitFor();
  assert.equal(await page.evaluate(() => window.__testTracks.filter(track => track.readyState === 'live').length), 0, 'A share without audio must release its video track');
  await page.evaluate(() => { window.__captureMode = 'active'; });
  const noInput = await snapshot();
  await panel.getByRole('button', { name: 'Start capture', exact: true }).click();
  await panel.getByRole('button', { name: 'Stop capture', exact: true }).waitFor(); await page.waitForTimeout(400);
  assert.notEqual(await snapshot(), noInput, 'Audio samples must reach the keyboard renderer');
  await page.getByRole('button', { name: 'Pause preview', exact: true }).click(); await page.waitForTimeout(100);
  const frozenAudio = await snapshot(); await page.waitForTimeout(250); assert.equal(await snapshot(), frozenAudio);
  await panel.getByLabel('Audio input', { exact: true }).selectOption('microphone');
  await page.getByRole('button', { name: 'Play preview', exact: true }).click();
  await panel.getByRole('button', { name: 'Start capture', exact: true }).click();
  await panel.getByRole('button', { name: 'Stop capture', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.__testTracks.filter(track => track.readyState === 'live').length), 1, 'Microphone capture should own only its audio track');
  await choose('Screen');
  assert.equal(await page.evaluate(() => window.__testTracks.filter(track => track.readyState === 'live').length), 0, 'Changing modes must release audio capture');
  const screenControls = panel.getByRole('complementary', { name: 'Screen controls' });
  await panel.getByLabel('Sample scene', { exact: true }).selectOption('ember');
  await screenControls.getByLabel('Capture area', { exact: true }).selectOption('center');
  assert.equal(await panel.locator('.studio-crop-guide').getAttribute('data-crop'), 'center');
  await panel.getByRole('button', { name: 'Choose screen', exact: true }).click();
  await panel.getByRole('button', { name: 'Stop sharing', exact: true }).waitFor(); await page.waitForTimeout(300);
  assert.ok(await panel.getByLabel('Shared screen', { exact: true }).isVisible());
  assert.ok(await page.evaluate(() => window.__testTracks.some(track => track.kind === 'video' && track.readyState === 'live')));
  await screenControls.getByLabel('Color mapping', { exact: true }).selectOption('average');
  await page.getByRole('button', { name: 'Pause preview', exact: true }).click(); await page.waitForTimeout(100);
  const frozenScreen = await snapshot(); await page.waitForTimeout(250); assert.equal(await snapshot(), frozenScreen);
  await panel.getByRole('button', { name: 'Stop sharing', exact: true }).click();
  assert.equal(await page.evaluate(() => window.__testTracks.filter(track => track.readyState === 'live').length), 0);

  // A source picker resolving after navigation must also be disposed.
  await choose('Audio'); await panel.getByLabel('Audio input', { exact: true }).selectOption('system'); await page.evaluate(() => { window.__captureMode = 'delayed'; });
  await panel.getByRole('button', { name: 'Start capture', exact: true }).click();
  await panel.getByRole('button', { name: 'Choose an input…', exact: true }).waitFor();
  await choose('Per-key'); await page.evaluate(() => { window.__releaseCapture(); });
  await page.waitForFunction(() => window.__testTracks.every(track => track.readyState === 'ended'));

  const keyControls = panel.getByRole('complementary', { name: 'Per-key controls' });
  const keyA = panel.getByRole('button', { name: 'Key A', exact: true }), keyS = panel.getByRole('button', { name: 'Key S', exact: true });
  const keyId = await keyA.getAttribute('data-led');
  await keyA.click(); await keyS.click({ modifiers: ['Shift'] });
  assert.equal(await keyA.getAttribute('aria-pressed'), 'true'); assert.equal(await keyS.getAttribute('aria-pressed'), 'true');
  await color(keyControls.getByLabel('Brush color', { exact: true }), '#ff4400');
  const beforePaint = await snapshot(); await keyControls.getByRole('button', { name: 'Apply to selected keys', exact: true }).click(); await page.waitForTimeout(100);
  assert.notEqual(await snapshot(), beforePaint); assert.equal((await saved()).perKey.colors[keyId], '#ff4400');
  await panel.getByRole('button', { name: 'Undo key colors', exact: true }).click(); assert.notEqual((await saved()).perKey.colors[keyId], '#ff4400');
  await panel.getByRole('button', { name: 'Redo key colors', exact: true }).click(); assert.equal((await saved()).perKey.colors[keyId], '#ff4400');
  await keyControls.getByRole('button', { name: 'Clear selected keys', exact: true }).click(); assert.equal((await saved()).perKey.colors[keyId], undefined);
  await panel.getByRole('button', { name: 'Undo key colors', exact: true }).click();
  await keyA.focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name: 'Per-key', exact: true }).getAttribute('aria-selected'), 'true', 'Keyboard navigation must stay inside the key editor');
  const exported = page.waitForEvent('download'); await panel.getByRole('button', { name: 'Export colors', exact: true }).click();
  const download = await exported, data = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(data.format, 'aula-f75-per-key-v1'); assert.equal(data.colors[keyId], '#ff4400');
  await panel.getByLabel('Import key color file', { exact: true }).setInputFiles({ name: 'colors.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...data, colors: { [keyId]: '#3355ee' } })) });
  await page.getByRole('status').filter({ hasText: 'Per-key colors imported' }).waitFor(); assert.equal((await saved()).perKey.colors[keyId], '#3355ee');

  await choose('Layers');
  const layersControls = panel.getByRole('complementary', { name: 'Layers controls' });
  assert.equal(await panel.locator('.studio-layer-row').count(), 3);
  await page.getByRole('button', { name: 'Pause preview', exact: true }).click(); await page.waitForTimeout(100);
  const beforeLayerEdit = await snapshot();
  await panel.getByRole('button', { name: 'Edit layer Aurora base', exact: true }).click();
  await layersControls.getByLabel('Curtain width', { exact: true }).press('End'); await page.waitForTimeout(100); assert.notEqual(await snapshot(), beforeLayerEdit);
  const beforeRate = await snapshot(); await layersControls.getByLabel('Motion rate', { exact: true }).press('End'); await page.waitForTimeout(100);
  assert.equal(await snapshot(), beforeRate, 'Changing a layer rate must preserve its phase on a paused frame');
  await panel.getByRole('button', { name: 'Move Comet trail down', exact: true }).click();
  assert.equal((await saved()).layers.items[0].name, 'Warm accents');
  await panel.getByRole('button', { name: 'Hide Warm accents', exact: true }).click(); assert.equal((await saved()).layers.items[0].enabled, false);
  await panel.getByRole('button', { name: 'Add layer', exact: true }).click(); assert.equal(await panel.locator('.studio-layer-row').count(), 4);
  await layersControls.getByLabel('Layer name', { exact: true }).fill('My layer');
  await layersControls.getByLabel('Effect', { exact: true }).selectOption('scanner');
  await layersControls.getByLabel('Key mask', { exact: true }).selectOption('arrows');
  assert.ok(await layersControls.getByLabel('Beam width', { exact: true }).count());
  assert.equal(await layersControls.getByLabel('Curtain width', { exact: true }).count(), 0);
  await panel.getByRole('button', { name: 'Duplicate My layer', exact: true }).click(); assert.equal(await panel.locator('.studio-layer-row').count(), 5);
  await panel.getByRole('button', { name: 'Delete My layer copy', exact: true }).click();
  while (await panel.locator('.studio-layer-row').count()) await panel.locator('.studio-layer-actions button[aria-label^="Delete "]').first().click();
  await panel.getByRole('heading', { name: 'No layers yet', exact: true }).waitFor();
  await panel.getByRole('button', { name: 'Add layer', exact: true }).click(); assert.equal((await saved()).layers.items.length, 1);

  await choose('System activity');
  const activityControls = panel.getByRole('complementary', { name: 'System activity controls' });
  await page.waitForFunction(() => !document.querySelector('[data-mode="system-activity"] .studio-metric-card strong').textContent.includes('—'));
  await panel.getByLabel('Activity data source', { exact: true }).selectOption('sample');
  await panel.getByLabel('Sample CPU', { exact: true }).press('Home');
  await page.waitForFunction(() => document.querySelector('[data-mode="system-activity"] .studio-metric-card strong').textContent === '0%'); await page.waitForTimeout(100);
  const zeroCPU = await snapshot(); await panel.getByLabel('Sample CPU', { exact: true }).press('End');
  await page.waitForFunction(() => document.querySelector('[data-mode="system-activity"] .studio-metric-card strong').textContent === '100%'); await page.waitForTimeout(100);
  assert.notEqual(await snapshot(), zeroCPU, 'Activity values must drive the keyboard');
  await activityControls.getByLabel('Visualization', { exact: true }).selectOption('zones');
  assert.equal(await activityControls.getByLabel('Metric', { exact: true }).count(), 0, 'Dual-metric zones must not expose an unused single-metric control');
  await panel.locator('.studio-metric-card').nth(1).click();
  assert.equal(await activityControls.getByLabel('Metric', { exact: true }).inputValue(), 'memory');
  await page.route('http://127.0.0.1:3001/telemetry', route => route.abort());
  await panel.getByLabel('Activity data source', { exact: true }).selectOption('computer');
  await panel.getByText(/The local telemetry helper is unavailable/).waitFor();
  await page.unroute('http://127.0.0.1:3001/telemetry');
  await panel.getByLabel('Activity data source', { exact: true }).selectOption('sample');
  await panel.getByLabel('Activity data source', { exact: true }).selectOption('computer');

  // Every editor stores actual settings; capture permissions are never restored automatically.
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('.studio[data-ready="true"]').waitFor();
  await choose('Per-key'); assert.equal((await saved()).perKey.colors[keyId], '#3355ee');
  assert.equal(await panel.locator('.studio-key-targets').count(), 1);
  await choose('Typing'); assert.equal(await panel.getByRole('complementary').getByLabel('Version', { exact: true }).inputValue(), 'pulse');
  await choose('Audio'); assert.equal(await panel.getByLabel('Audio input', { exact: true }).inputValue(), 'system');
  assert.ok(await panel.getByRole('button', { name: 'Start capture', exact: true }).count());
  await panel.getByLabel('Audio input', { exact: true }).selectOption('sample');
  await page.evaluate(() => localStorage.removeItem('aula-f75.studio.modes.v1'));
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('.studio[data-ready="true"]').waitFor();
  await mkdir('test-results/studio/modes', { recursive: true });
  for (const [name, id] of [['Typing', 'typing'], ['Audio', 'audio'], ['Screen', 'screen'], ['Per-key', 'per-key'], ['Layers', 'layers'], ['System activity', 'system-activity']]) {
    await page.getByRole('tab', { name, exact: true }).click();
    await panel.locator(`:scope[data-mode="${id}"]`).waitFor();
    if (id === 'typing') await panel.getByRole('button', { name: 'Run typing demo', exact: true }).click();
    await page.waitForTimeout(250);
    assert.equal(await page.getByText('In the build plan', { exact: true }).count(), 0);
    assert.equal(await page.locator('.studio-sidebar').innerText(), '');
    await page.screenshot({ path: `test-results/studio/modes/${id}.png`, fullPage: true });
    for (const viewport of [{ width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport); await page.waitForTimeout(100);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} must fit at ${viewport.width}px`);
      await page.screenshot({ path: `test-results/studio/modes/${id}-${viewport.width}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 960 });
  }
  assert.deepEqual(errors, []);
  console.log('Six lighting modes passed: typing/blur/input scope, reactive controls, real audio/video MediaStreams, denied/missing/delayed capture cleanup, pause, per-key editing/history/import/export, layer composition editing, telemetry/fallback, persistence, and four viewport sizes.');
} finally { await browser.close(); }
