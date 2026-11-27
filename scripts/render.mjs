// Render an episode frame by frame in headless Chrome (on your graphics card) and turn it into an mp4.
//   node scripts/render.mjs float-up out/float-up.mp4            -> the whole video (silent)
//   node scripts/render.mjs float-up out/stills --stills 0,900,3000  -> still pictures to check first
//   node scripts/render.mjs float-up out/part.mp4 --from 0 --to 300   -> only part of it
//   --fps 60 (default) for videos. --blur 4 (default) = motion blur: each frame is the average of 4 renders across half a frame of time,
//   like a real camera. Without it, fast-shrinking roads and rows of houses jitter (the wagon-wheel effect). --blur 1 = off.
//   node scripts/render.mjs float-up out/side --stills 600 --side 0.6,-0.1,-0.5  -> the same moment seen from beside you (to find problems)
// Add the sound afterwards with scripts/sound.py + scripts/mux.mjs.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';
import ffmpegPath from 'ffmpeg-static';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [ep, out] = args;
if (!ep || !out) { console.log('usage: node scripts/render.mjs <episode> <out.mp4 | out-folder --stills 0,30,60>'); process.exit(1); }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.ttf': 'font/ttf', '.json': 'application/json', '.glb': 'model/gltf-binary' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

// use the real graphics card: Metal on Mac, Direct3D on Windows
const gpu = os.platform() === 'darwin' ? ['--use-angle=metal'] : os.platform() === 'win32' ? ['--use-angle=d3d11'] : ['--use-angle=vulkan', '--enable-features=Vulkan'];
const browser = await puppeteer.launch({ headless: 'shell', args: [...gpu, '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-vsync', '--hide-scrollbars'] });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[page error]', e.message));
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
// video at 60 fps by default (smooth over busy ground); --stills frame numbers are always at 30 fps (frame = seconds x 30)
const FPS_OUT = opt('--stills') ? 30 : Number(opt('--fps', 60));
await page.evaluateOnNewDocument((pr, side, fps, ns) => { window.__RENDERER = true; window.__PR = pr; window.__FPS = fps; if (ns) window.__NOSHADOW = true; if (side) window.__SIDE = side.split(',').map(Number); },
  Number(opt('--pr', '2')), opt('--side', ''), FPS_OUT, args.includes('--no-shadows'));
await page.goto(`http://localhost:${port}/index.html?ep=${encodeURIComponent(ep)}`);
await page.waitForFunction('window.READY === true && typeof window.renderFrame === "function"', { timeout: 180000 });
const gl = await page.evaluate(() => { const g = document.getElementById('c').getContext('webgl2'); const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); });
console.log('graphics:', gl);
if (/swiftshader|llvmpipe/i.test(gl)) console.log('WARNING: Chrome is not using your graphics card, so rendering will be slow. Tell Claude: "the render is using SwiftShader".');
const total = await page.evaluate('window.TOTAL_FRAMES');
const stage = await page.$('#stage');

// draw frame f (motion blur: average of N renders spread over half a frame, a 180-degree shutter)
const BLUR = Math.max(1, Number(opt('--blur', 4)));
async function drawFrame(f) {
  await page.evaluate((f, N) => {
    if (N === 1) { window.renderFrame(f); return; }
    const gl = document.getElementById('c'), acc = document.getElementById('acc');
    if (acc.width !== gl.width) { acc.width = gl.width; acc.height = gl.height; acc.style.width = '1920px'; acc.style.height = '1080px'; }
    const ctx = acc.getContext('2d');
    for (let k = 0; k < N; k++) {
      window.renderFrame(f + ((k + 0.5) / N - 0.5) * 0.5);
      ctx.globalAlpha = 1 / (k + 1); ctx.drawImage(gl, 0, 0);
    }
    acc.style.display = 'block';
  }, f, BLUR);
  // wait until the browser has really put this frame on screen before the screenshot; without this the screenshot
  // sometimes catches the previous frame, so frames repeat or jump back (a stutter that looks like shaking)
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
}
const stills = opt('--stills');
if (stills) {
  fs.mkdirSync(out, { recursive: true });
  for (const f of stills.split(',').map(Number)) {
    await drawFrame(f);
    await stage.screenshot({ path: path.join(out, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    console.log('still', f, `(${(f / 30).toFixed(1)} s)`);
  }
} else {
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const from = Number(opt('--from', 0)), to = Number(opt('--to', total));
  const ff = spawn(ffmpegPath, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS_OUT), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    await drawFrame(f);
    const buf = await stage.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % (10 * FPS_OUT) === 0) {
      const done = f - from + 1, sec = (Date.now() - t0) / 1000;
      console.log(`frame ${f}/${to}  ${sec.toFixed(0)} s so far, about ${((to - f) * sec / done / 60).toFixed(1)} min left`);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('done:', out);
}
await browser.close();
server.close();
