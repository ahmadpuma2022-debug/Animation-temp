"""Sound for "What if you floated up and couldn't stop?" (6:00 = the 9:00 journey at SPEED 1.5, read from scene.js): made in code, nothing to license.
python3 episodes/float-up/sound.py out/float-up.wav
- a drone pad all the way (warm on Earth, colder and higher in space, a last swell for Voyager)
- wind that follows your real speed and the real air pressure: loud low down, thinning out, silent from the Kármán line
- one-off sounds at the wow moments, timed to scene.js (the keyframes are read from scene.js so they always match)."""
import os, re, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'scripts'))
from soundlib import Kit, SR, log_curve, sm, write

out = sys.argv[1] if len(sys.argv) > 1 else 'out/float-up.wav'

# ---------- the same altitude curve as the picture: read AK from scene.js ----------
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scene.js')).read()
ak_js = re.search(r'const AK = (\[.*?\]);', src, re.S).group(1)
AK = eval(re.sub(r'//[^\n]*', '', ak_js))
SP = float(os.environ.get('SPEED') or re.search(r'window\.__SPEED\) \|\| ([0-9.]+)', src).group(1))   # same speed as the picture
DUR = 540 / SP   # every moment below is written in journey time (as in scene.js) and divided by SP
alt = log_curve(AK)

k = Kit(DUR)
t = k.t
# control-rate curves (100 per second), stretched to audio rate with k.up()
tco = np.arange(0, DUR + 0.01, 0.01)   # video time
tc = tco * SP                            # journey time
a = alt(tc)
v = np.gradient(a, tco)                                         # your speed, m/s
pressure = np.exp(-a / 7000)                                   # air pressure as a share of sea level (good to a few %)
speed01 = np.clip(np.log10(1 + v) / np.log10(1 + 400), 0, 1)   # 0 standing still .. 1 at 400 m/s and faster
outdoors = sm(15.0, 17.5, tc)                                  # inside your room there is no wind
air = np.clip(pressure ** 0.5, 0, 1) * (1 - sm(90000, 100000, a))    # thins out (-12 dB at 19 km, -20 dB at 33 km), gone at the Kármán line
cloud = sm(104, 107, tc) * (1 - sm(112, 115, tc))              # inside the cloud: softer, muffled

# ---------- noise beds made once and reused (each one is a full-length filter pass) ----------
n_low = k.band(k.noise(), 90, 700)
n_mid = k.band(k.noise(), 300, 3000)
n_high = k.band(k.noise(), 2500, 9000)
def gauss(at, dur): at, dur = at / SP, dur / SP; return np.exp(-0.5 * ((t - at) / (dur / 2.6)) ** 2).astype(np.float32)
def swoosh(at, dur, g, nz): return g * gauss(at, dur) * nz

L = np.zeros(k.n, np.float32); R = np.zeros(k.n, np.float32)
def both(x, pan=0.5):   # pan 0 = left, 1 = right (equal power)
    global L, R
    L += x * np.float32(np.sqrt(1 - pan)); R += x * np.float32(np.sqrt(pan))

# ---------- drone pad ----------
# A: 55, 82, 110, 165, 220, 330 Hz. One shared pad in both channels + a second one in opposite phase for width:
# played as one channel (phones), the width part cancels and the shared pad stays whole
A, B = k.pad(), k.pad(); earth_pad_L, earth_pad_R = 0.85 * A + 0.4 * B, 0.85 * A - 0.4 * B
space_notes = ((55, 1.0), (82.41, 0.5), (123.47, 0.35), (164.81, 0.35), (246.94, 0.2), (329.63, 0.12), (493.88, 0.06))
A, B = k.pad(space_notes), k.pad(space_notes); space_pad_L, space_pad_R = 0.85 * A + 0.4 * B, 0.85 * A - 0.4 * B; del A, B
x_space = k.up(tco, sm(290, 330, tc))                           # cross into the colder chord around the Kármán line
pad_level = k.up(tco, 0.10 + 0.10 * sm(2, 20, tc) + 0.06 * sm(60, 120, tc) + 0.04 * sm(300, 340, tc)
                 - 0.05 * sm(425, 440, tc) * (1 - sm(500, 515, tc)) + 0.06 * sm(505, 518, tc))   # thinner far out, a swell for Voyager
L += pad_level * ((1 - x_space) * earth_pad_L + x_space * space_pad_L)
R += pad_level * ((1 - x_space) * earth_pad_R + x_space * space_pad_R)
shimmer = (k.tone(659.25, 0.5) + k.tone(880, 0.35) + k.tone(987.77, 0.25)) * k.lfo(0.2, 0.5, 40)
both(shimmer * k.up(tco, 0.012 * sm(505, 520, tc)))             # a high shimmer for the last shot

# ---------- the room: a quiet hum, then a soft thud through the ceiling ----------
both(n_low * k.up(tco, 0.025 * (1 - sm(14.5, 15.6, tc))))
both(k.thump((1.3) / SP, f=50, g=0.10))                               # your feet leave the floor
both(k.thump((14.7) / SP, f=58, g=0.24))                              # head through the ceiling
both(swoosh(15.0, 1.2, 0.10, n_mid))
both(k.thump((15.4) / SP, f=72, g=0.12))                              # out through the roof

# ---------- wind: two independent beds (left/right), following speed and air ----------
amount = k.up(tco, outdoors * air * (1 - 0.55 * cloud))
spd = k.up(tco, speed01 * (1 - 0.5 * cloud))
L += k.wind(amount, spd, 1); R += k.wind(amount, spd, 7)
both(swoosh(109.5, 7.0, 0.07, n_low))                          # into and out of the cloud: a soft rush
both(swoosh(108.0, 1.6, 0.05, n_mid), 0.35); both(swoosh(111.6, 1.6, 0.05, n_mid), 0.65)

# ---------- set pieces ----------
both(swoosh(70.0, 5.0, 0.07, n_low), 0.62)                     # level with the Eiffel Tower (to your right)
both(swoosh(90.0, 5.0, 0.08, n_low), 0.68)                     # past the Burj Khalifa's spire
both(swoosh(170.0, 9.0, 0.06, n_low), 0.58)                    # Everest: a low swell
# a small propeller plane far below, crossing left -> right around 2:10.7
prop = sum(np.sin(2 * np.pi * 88 * h * t) / h for h in (1, 2, 3, 4, 5)).astype(np.float32) * (1 + 0.5 * np.sin(2 * np.pi * 11 * t)).astype(np.float32)
prop_env = gauss(130.7, 14.0) * 0.035
pan = np.clip(0.5 + 0.5 * np.tanh((t - 130.7 / SP) / (4.0 / SP)), 0, 1).astype(np.float32)
L += prop * prop_env * np.sqrt(1 - pan); R += prop * prop_env * np.sqrt(pan)
jl, jr = k.jet_pass((189.3) / SP, g=0.26); L += jl; R += jr          # the airliner crosses left -> right just below you
both(swoosh(250.0, 5.0, 0.05, n_low), 0.55)                    # the burst balloon falls past
for m0 in (284.5, 286.8, 288.6, 290.9, 292.4, 294.3, 296.2):   # meteors: tiny far sparkles
    both(swoosh(m0 + 0.4, 0.9, 0.015, n_high), float(np.clip(0.5 + 0.3 * np.sin(m0), 0, 1)))

# ---------- bells: soft, one per big moment in space ----------
both(k.bell((310.5) / SP, notes=((440, 1), (659.25, 0.5), (880, 0.2)), g=0.05, decay=4.0))         # the Kármán line
both(k.bell((330.0) / SP, notes=((329.63, 1), (493.88, 0.4)), g=0.035, decay=3.0), 0.6)            # the ISS
both(k.bell((370.0) / SP, notes=((1318.5, 1), (1975.5, 0.4)), g=0.022, decay=1.6), 0.6)            # GPS: a little ping
both(k.bell((371.2) / SP, notes=((1318.5, 1), (1975.5, 0.4)), g=0.014, decay=1.6), 0.6)
both(k.bell((390.5) / SP, notes=((659.25, 1), (987.77, 0.6), (1318.5, 0.3)), g=0.03, decay=5.0))  # the geostationary ring
both(k.bell((413.5) / SP, notes=((110, 1), (164.81, 0.6), (220, 0.4), (329.63, 0.2)), g=0.07, decay=6.0), 0.62)   # the Moon
both(swoosh(415.0, 8.0, 0.05, n_low), 0.62)
both(swoosh(431.0, 16.0, 0.045, n_mid))                        # the huge speed-up to 1 AU: a long faint rush
both(k.bell((440.5) / SP, notes=((261.63, 1), (392, 0.5)), g=0.035, decay=5.0))                   # Earth: a bright dot
both(k.bell((465.5) / SP, notes=((196, 1), (293.66, 0.5), (392, 0.25)), g=0.045, decay=5.0), 0.65) # Neptune
both(k.bell((490.5) / SP, notes=((523.25, 1), (783.99, 0.4)), g=0.03, decay=6.0))                 # the pale blue dot
both(k.bell((514.5) / SP, notes=((220, 1), (329.63, 0.6), (440, 0.45), (659.25, 0.2)), g=0.07, decay=9.0), 0.6)  # Voyager 1
both(k.bell((526.0) / SP, notes=((440, 1), (659.25, 0.4)), g=0.03, decay=8.0), 0.6)

os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
write(out, L, R, t, DUR)
