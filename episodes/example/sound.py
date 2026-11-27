"""Sound for the 38-second example (no narrator), made in code: nothing to license. Copy it for a new episode.
python3 episodes/example/sound.py out/example.wav
- a drone pad all the way, a quiet room hum, a thud through the ceiling, a rush out of the roof
- wind that follows your real speed and fades as the air thins
- the keyframes are read from scene.js, so the sound always matches the picture."""
import os, re, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'scripts'))
from soundlib import Kit, log_curve, sm, write

src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scene.js')).read()
DUR = float(re.search(r'export const DURATION = ([0-9.]+)', src).group(1))
AK = eval(re.sub(r'//[^\n]*', '', re.search(r'const AK = (\[.*?\]);', src, re.S).group(1)))
alt = log_curve(AK)

k = Kit(DUR); t = k.t
tc = np.arange(0, DUR + 0.01, 0.01); Ac = alt(tc); velc = np.gradient(Ac, tc)
A = k.up(tc, Ac); eye = A + 1.6
outside = sm(4.6, 5.2, eye)                                      # no wind in your room
air = np.clip(np.exp(-A / 7500.0) * 1.3, 0, 1) ** 0.6            # thins with height
spd = k.up(tc, np.clip(np.log10(np.abs(velc) + 1) / 2.6, 0, 1))  # 0 standing still .. 1 fast
in_cloud = sm(1360, 1480, A) * (1 - sm(1700, 1820, A))

drone = k.pad() * (0.55 + 0.3 * sm(0, 30, t)) * (1 + 0.08 * np.sin(2 * np.pi * 0.11 * t))
music = drone * 0.16 * (1 - 0.4 * sm(DUR - 3, DUR, t))
room = k.band(k.noise(), 60, 300) * 0.03 * (1 - outside)
gust = lambda seed: k.wind(outside * air, spd, seed) + in_cloud * 0.07 * k.band(k.noise(), 900, 7000) * k.lfo(1.2, 0.3, seed + 3)
windL, windR = gust(1), gust(21)

# one-off sounds, placed where the picture reaches them (found from the altitude, so they move with the keyframes)
ceil_t = t[np.argmax(eye >= 2.72)]; roof_t = t[np.argmax(eye >= 4.8)]
fx = k.thump(ceil_t, 55, 0.25) + 0.6 * k.thump(ceil_t + 0.12, 90, 0.12) + k.whoosh(roof_t + 0.15, 1.2, 0.16, 300, 3000)
if A[-1] > 1380:
    fx += k.whoosh(t[np.argmax(A >= 1380)], 1.6, 0.12, 500, 5000)   # into the cloud
common = music + room + fx
write(sys.argv[1] if len(sys.argv) > 1 else 'out/example.wav', common + windL, np.roll(common, 240) * 0.98 + windR, t, DUR)
