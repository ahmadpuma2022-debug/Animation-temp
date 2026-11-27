"""Sound for 'What if you dug down and couldn't stop?' (8:02), made in code.
python3 episodes/dig-down/sound.py out/dig-down.wav
Drone pad that deepens and warms, rock rumble that follows your speed, whooshes at the wow objects,
a low pulse at the centre, then water, then air and a soft bell as you break out."""
import os, re, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'scripts'))
from soundlib import Kit, sm, write

src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scene.js')).read()
DUR = float(re.search(r'export const DURATION = ([0-9.]+)', src).group(1))
T = eval(re.search(r'const T = (\[.*?\]);', src, re.S).group(1))
DV = eval(re.search(r'const DV = (\[.*?\]);', src, re.S).group(1))
k = Kit(DUR); t = k.t
# camera speed along the shaft (units/s) from the same stage keys the picture uses (piecewise smooth)
tk = np.array(T + [482.0]); dk = np.array(DV + [-70.0], dtype=float)
D = np.interp(t, tk, dk); D = np.convolve(D, np.ones(2001) / 2001, mode='same')
spd = np.abs(np.gradient(D, t)) * 4.0; spd = np.clip(spd / 70.0, 0, 1).astype(np.float32)

depth = np.clip(np.abs(D) / 1275.0, 0, 1).astype(np.float32)
in_room = 1 - sm(1.5, 2.6, t)
water = sm(395, 410, t) * (1 - sm(447, 452, t))
air = sm(447, 455, t)

drone = k.pad() * (0.5 + 0.35 * depth) * (1 + 0.08 * np.sin(2 * np.pi * 0.09 * t))
music = drone * 0.17 * (1 - 0.4 * sm(DUR - 3, DUR, t))
rumble = k.band(k.noise(), 35, 180) * (0.03 + 0.22 * spd) * (1 - water) * (1 - air)
hiss = k.band(k.noise(), 600, 5000) * 0.05 * spd * (1 - in_room) * (1 - air)
roomhum = k.band(k.noise(), 60, 300) * 0.03 * in_room
wat = k.band(k.noise(), 80, 900) * 0.07 * water * k.lfo(0.3, 0.4, 5)
wind = k.band(k.noise(), 300, 4000) * 0.06 * air * (1 - sm(470, 482, t) * 0.5)

fx = k.thump(0.2, 45, 0.3) + k.whoosh(1.0, 2.2, 0.2, 100, 2500)
for i in (5, 6, 7, 8, 9, 10, 12, 14, 16, 17, 18, 19, 22, 23, 25):  # each landmark: a rising whoosh, a hit, a soft bell
    ti = T[i]
    fx = fx + k.whoosh(ti - 2.6, 2.8, 0.11, 150, 2200) + k.thump(ti, 58, 0.18) + k.bell(ti + 0.05, g=0.022)
for b in np.arange(248.0, 304.5, 1.0):                                # a heartbeat that grows toward the centre
    fx = fx + k.thump(float(b), 44, 0.06 + 0.2 * (b - 248) / 56)
fx = fx + k.thump(305, 38, 0.35) + k.thump(306.2, 46, 0.22)         # the centre
fx = fx + k.whoosh(448, 3.0, 0.16, 300, 4000)                       # out of the water
for b in (452.0, 458.0, 466.0):
    fx = fx + k.bell(b, g=0.05)
L = music + rumble + hiss + roomhum + wat + wind + fx
R = np.roll(music + rumble * 0.96 + hiss + roomhum + wat + wind + fx, 240) * 0.98
write(sys.argv[1] if len(sys.argv) > 1 else 'out/dig-down.wav', L, R, t, DUR)
