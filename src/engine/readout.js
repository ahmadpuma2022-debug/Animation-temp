import { smooth } from './stage.js';

// The readout: big number top-left, a second value top-right, one short line at the bottom.
// ---------- overlay ----------
const $ = (id) => document.getElementById(id);
export const fmtAlt = (a) => a < 10 ? a.toFixed(1) + ' m' : a < 10000 ? Math.round(a).toLocaleString('en-US') + ' m'
  : a < 100000 ? (a / 1000).toFixed(1) + ' km' : Math.round(a / 1000).toLocaleString('en-US') + ' km';
// a distance the way the journey writes it: metres up to 100 km, then km, then million / billion km
// (each step is chosen on the ROUNDED value, so 99,999.9 m shows "100 km", never "100,000 m")
export const fmtDist = (a) => a < 9.95 ? a.toFixed(1) + ' m' : Math.round(a) < 100000 ? Math.round(a).toLocaleString('en-US') + ' m'
  : Math.round(a / 1000) < 1e6 ? Math.round(a / 1000).toLocaleString('en-US') + ' km'
  : a / 1e9 < 999.95 ? (a / 1e9).toFixed(1) + ' million km' : (a / 1e12).toFixed(1) + ' billion km';
// International Standard Atmosphere temperature (°C) up to 86 km. The layers are defined on geopotential height,
// so the height above sea level is converted first (8,849 m -> 8,837 m): this is what the 1976 standard tables give.
export function tempAt(a) {
  const h = 6356.766 * (a / 1000) / (6356.766 + a / 1000);
  if (h < 11) return 15 - 6.5 * h;
  if (h < 20) return -56.5;
  if (h < 32) return -56.5 + (h - 20);
  if (h < 47) return -44.5 + 2.8 * (h - 32);
  if (h < 51) return -2.5;
  if (h < 71) return -2.5 - 2.8 * (h - 51);
  return -58.5 - 2.0 * (h - 71);
}
// opts (all optional): num(a) -> the big number's text; right(a) -> [label, value, opacity] for the top right;
// fit: the widest the big number may be (px) before its font shrinks (long numbers like "149.6 million km")
let baseNum = 0;
export function overlay(t, a, LINES, opts = {}) {
  const num = $('num');
  num.textContent = (opts.num || fmtAlt)(a);
  if (opts.fit) {
    baseNum = baseNum || parseFloat(getComputedStyle(num).fontSize);
    num.style.fontSize = baseNum + 'px';
    const w = num.scrollWidth;
    if (w > opts.fit) num.style.fontSize = (baseNum * opts.fit / w).toFixed(1) + 'px';
  }
  let rightOp = 1;
  if (opts.right) { const [lab, val, op] = opts.right(a); $('tlab').textContent = lab; $('tnum').textContent = val; rightOp = op ?? 1; }
  else {
    const T = Math.round(tempAt(a));
    $('tnum').textContent = a > 85000 ? 'almost none' : (T < 0 ? '−' + Math.abs(T) : T) + ' °C';
  }
  let txt = '', op = 0;
  for (const [t0, t1, s] of LINES) if (t >= t0 && t < t1) { txt = s; op = Math.min(smooth(t0, t0 + 0.45, t), 1 - smooth(t1 - 0.45, t1, t)); }
  $('line').textContent = txt; $('line').style.opacity = op;
  // readout fades in at the start
  const ro = smooth(0.1, 0.7, t);
  for (const id of ['label', 'num', 'sub', 'tlab', 'tnum']) $(id).style.opacity = ro * (id === 'sub' || id === 'tlab' ? 0.9 : 1) * (id[0] === 't' ? rightOp : 1);
}

