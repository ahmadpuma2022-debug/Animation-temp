"""Sound tools for "what if" videos: drone pads, wind, whooshes, thuds, a passing jet, bells. numpy only.
Each episode has its own sound.py that imports this file (see episodes/float-up/sound.py)."""
import wave
import numpy as np

SR = 48000

def timeline(dur):
    n = int(SR * dur); return n, np.arange(n, dtype=np.float64) / SR

def log_curve(keys, off=0.25):
    """Same curve as logCurve() in src/engine/stage.js: smooth in log space through [(t, value), ...]."""
    xs = np.array([k[0] for k in keys], float); ys = np.log(np.array([k[1] for k in keys], float) + off)
    d = np.diff(ys) / np.diff(xs); m = np.zeros(len(xs)); m[0], m[-1] = d[0], d[-1]
    for i in range(1, len(xs) - 1): m[i] = 0 if d[i - 1] * d[i] <= 0 else (d[i - 1] + d[i]) / 2
    for i in range(len(xs) - 1):
        if d[i] == 0: m[i] = m[i + 1] = 0; continue
        a, b = m[i] / d[i], m[i + 1] / d[i]; s = a * a + b * b
        if s > 9: k = 3 / np.sqrt(s); m[i], m[i + 1] = k * a * d[i], k * b * d[i]
    def f(tt):
        tt = np.clip(tt, xs[0], xs[-1]); i = np.clip(np.searchsorted(xs, tt) - 1, 0, len(xs) - 2)
        h = xs[i + 1] - xs[i]; u = (tt - xs[i]) / h
        y = (2*u**3 - 3*u**2 + 1) * ys[i] + (u**3 - 2*u**2 + u) * h * m[i] + (-2*u**3 + 3*u**2) * ys[i + 1] + (u**3 - u**2) * h * m[i + 1]
        return np.maximum(0, np.exp(y) - off)
    return f

def sm(a, b, x): u = np.clip((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u)

class Kit:
    def __init__(self, dur, seed=11):
        self.dur = dur; self.n, self.t = timeline(dur); self.rng = np.random.default_rng(seed)
    def noise(self): return self.rng.standard_normal(self.n).astype(np.float32)
    def up(self, tc, c): return np.interp(self.t, tc, c).astype(np.float32)
    def band(self, x, lo, hi):
        F = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
        g = np.exp(-0.5 * (np.log(np.maximum(f, 1) / np.sqrt(lo * hi)) / (np.log(hi / lo) / 2.2)) ** 2)
        out = np.fft.irfft(F * g, len(x)).astype(np.float32); return out / (np.abs(out).max() + 1e-9)
    def lfo(self, rate, depth, seed):
        r = np.random.default_rng(seed); pts = r.uniform(-1, 1, int(self.dur * rate) + 3)
        return (1 + depth * np.interp(self.t * rate, np.arange(len(pts)), pts)).astype(np.float32)
    def pad(self, notes=((55, 1.0), (82.41, 0.55), (110, 0.6), (164.81, 0.35), (220, 0.22), (329.63, 0.1))):
        t = self.t; out = np.zeros(self.n, np.float32)
        for f0, amp in notes:
            for det in (-0.25, 0.25): out += (amp * np.sin(2 * np.pi * (f0 + det) * t + self.rng.uniform(0, 6.28))).astype(np.float32)
        return out / np.abs(out).max()
    def tone(self, f, amp=1.0): return (amp * np.sin(2 * np.pi * f * self.t)).astype(np.float32)
    def thump(self, at, f=60, g=0.22):
        x = np.clip(self.t - at, 0, None); e = np.where(self.t >= at, np.exp(-x * 9), 0)
        return (g * e * np.sin(2 * np.pi * f * x * (1 - 0.3 * np.clip(x, 0, 1)))).astype(np.float32)
    def whoosh(self, at, dur, g, lo, hi):
        return (g * np.exp(-0.5 * ((self.t - at) / (dur / 2.6)) ** 2)).astype(np.float32) * self.band(self.noise(), lo, hi)
    def wind(self, amount, speed, seed):
        """amount and speed are 0..1 curves (already at audio rate)."""
        low = self.band(self.noise(), 70, 380) * self.lfo(0.35, 0.35, seed)
        mid = self.band(self.noise(), 350, 1600) * self.lfo(0.5, 0.45, seed + 1)
        high = self.band(self.noise(), 1800, 6000) * self.lfo(0.7, 0.5, seed + 2)
        return amount * (0.10 * low * (0.4 + 0.6 * speed) + 0.07 * mid * speed + 0.035 * high * speed ** 1.5)
    def jet_pass(self, at, g=0.32):
        """A jet crossing left -> right; returns (left, right)."""
        t = self.t
        jet = self.band(self.noise(), 120, 2600) * 0.7 + self.band(self.noise(), 2000, 7000) * 0.3
        whine = np.sin(2 * np.pi * (1900 - 160 * np.tanh((t - at) / 1.2)) * t).astype(np.float32) * 0.05
        env = (np.exp(-0.5 * ((t - at) / 2.2) ** 2) * g).astype(np.float32)
        pan = np.clip(0.5 + 0.5 * np.tanh((t - at) / 1.5), 0, 1).astype(np.float32)
        return (jet + whine) * env * np.sqrt(1 - pan), (jet + whine) * env * np.sqrt(pan)
    def bell(self, at, notes=((523.25, 1), (783.99, 0.5), (1046.5, 0.25)), g=0.05, decay=3.0):
        t = self.t; b = sum(a * np.sin(2 * np.pi * f * (t - at)) for f, a in notes)
        return (b * np.where(t >= at, np.exp(-(t - at) / decay), 0) * g).astype(np.float32)

def write(path, L, R, t, dur, level_db=-19):
    mix = np.stack([L, R], 1)
    mix *= (sm(0, 1.0, t) * (1 - sm(dur - 2.5, dur, t)))[:, None]
    mix = np.tanh(mix * 1.4) / 1.4
    rms = np.sqrt(np.mean(mix.astype(np.float64) ** 2)); mix *= 10 ** (level_db / 20) / rms
    mix = np.clip(mix, -0.95, 0.95)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
    print('wrote', path, 'peak dBFS', round(20 * np.log10(np.abs(mix).max()), 1))
