---
name: what-if-3d
description: Make "What if you ___ and couldn't stop?" videos (one unbroken first-person 3D shot, a big real number in the corner, one short line at the bottom, drone + wind, no narrator, 8-10 min) entirely from code with three.js, on this computer. Study a reference video, write the journey with real numbers, build the 3D world, check stills, make the sound, render, package. Use when the user says "study this video", "write down the format", "give me ideas", "write the journey", "build the scene", "check the stills", "make the sound", "render the full video", "show me a side view", "package it", or "something looks wrong at m:ss".
---

# What if… couldn't stop (free skill)

Everything is made on this computer: no AI video generator, no voice, no stock footage.
- **Pictures:** three.js, drawn frame by frame in headless Chrome on the graphics card (`scripts/render.mjs`).
- **World pieces:** `src/engine/` — your bedroom + house (`home.js`), a whole town with a river (`town.js`), a cloud layer (`clouds.js`), the Eiffel Tower, the Burj Khalifa and Everest (`landmarks.js`), the round Earth, stars, a plane, a weather balloon, the space station and the Moon (`space.js`), a burst balloon, meteors, a GPS satellite, the ring of geostationary satellites, Neptune, Voyager 1 and Earth as a pale blue dot (`deepspace.js`), your own hands (`hands.js`, a real rigged human hand model), dust and speed streaks (`motes.js`), the sky, sun and haze (`stage.js`), the readout (`readout.js`).
- **Sound:** made in code with `scripts/soundlib.py` (drone, wind, whooshes, a passing jet, bells). Nothing to license, nothing to get claimed.
- **Episodes:** one folder each in `episodes/<name>/`: `scene.js` (the journey + camera + lines + the world) and `sound.py`. `episodes/example/` is the smallest one (38 s, picture + sound). Copy it to start. `episodes/float-up/` (if you have it) is a full one: a 9-minute journey from your bedroom to Voyager 1, played 1.5× faster (`SPEED`).

Always work inside this project folder. Start a **new chat for every new video**.

## The commands

### 1. "Study this video and write down the format" (with a YouTube link)
`python3 scripts/study.py <link> <name>`. It downloads the video **only to study it** (never upload any of it) and makes contact sheets: one frame per second for the first minute, one every 10 seconds for the whole video. **Look at every sheet** and measure, don't describe:
- **Readout:** where the label, the big number and the small line sit (% from the left and top), their sizes as a share of the frame height, font style (serif / sans, weight, letter spacing), colour, shadow.
- **The number:** read it on the sheets. How fast does it grow (per minute at the start, the middle, the end)? Units and when they switch (m → km).
- **The bottom line:** how often it changes (seconds), how long it stays, words per line, tone.
- **Camera:** first person? Where do you look (down, ahead, up) in each part? Is there a body (hands)? Any cuts?
- **World:** low-poly or detailed? Light (time of day), haze, colours.
- **Wow moments:** list every big object and its time.
- **Length** and the **title formula**.
Write it all to `styles/<name>.md`, every rule as a number or a yes/no.

### 2. "Give me 10 ideas" / "Write the journey"
(Or use the free master prompt in claude.ai.) Ideas must have ONE number that keeps changing, real places to SHOW, and a huge ending. Search YouTube for each; drop any idea that already has 500K+ views. Then write `episodes/<name>/journey.md`: 20-28 stages for 9 minutes, each with the time, the real number, what we see, the bottom line (max 8 words, calm, second person, no "!"), and the fact. Write **more bottom lines than stages**: one every 8-12 seconds of video (Minute Zero changes it every 4-5 s), each one a true, simple fact about where you are now. Last line: "And you still can't stop." Add a sources table. **Check every number.**

### 3. "Build the scene"
1. Copy `episodes/example/` to `episodes/<name>/`.
2. In `scene.js` set `DURATION`, the keyframes `AK` (time → the number, real values from journey.md; the curve is smooth in log space so it can go from centimetres to hundreds of thousands of km), `PITCH` / `YAW` (where you look, in degrees: look down to show what you're leaving, ahead for wow objects, up for what's coming), and `LINES` (time in, time out, text).
3. Use the engine pieces. If the idea needs something new (a road, a city, the inside of a body, the Sun), write it as a new builder in `src/engine/` in the same low-poly style (flat shading, `M(color)`, `jitter()`, `instanced()` for many copies) and call it from `scene.js`.
4. Put wow objects where the camera will be at their moment (see `near()` and `placeSetPieces()` in `episodes/float-up/scene.js`, or `PLANE_T` in `episodes/example/scene.js`). Slow the number down a little around them (closer keyframes) so they stay on screen for 4-10 seconds.
5. If the number is not height, change the readout label and the top-right value with `overlay()`'s options (`num`, `right`, `fit` in `readout.js`; `READOUT` in `episodes/float-up/scene.js` shows them).
6. Too slow? Write the journey in its own time and set `SPEED` (see `episodes/float-up/scene.js`): 1.5 plays a 9-minute journey in 6 minutes. Every time in `scene.js` and `sound.py` stays journey time. Check the camera turns again after a speed-up (under about 12 degrees per second).

### 4. "Check the stills" (always before a full render)
`node scripts/render.mjs <name> out/<name>_stills --stills <frames>` with one frame every 15-20 seconds (frame = seconds × 30), then `python3 scripts/sheet.py out/<name>_stills out/<name>_sheet.jpg` and **look at the sheet**. Check every still: is the number right for that moment, is the line readable, is the wow object in frame and lit, is the camera inside a wall, is the screen black or white for too long, do the hands look natural, **is the number clear of big objects** (a mountain or a tower right behind the number makes it hard to read: move the object to the side or change where you look). Fix and check again. A full render takes minutes; a still takes a second.

### 5. "Show me a side view" (when something looks wrong and you can't tell why)
`node scripts/render.mjs <name> out/side --stills <frame> --side 0.6,-0.1,-0.5` draws the same moment from beside you (metres from your eyes: right, up, back). Look at it to see what is really there (a hand turned the wrong way, an object behind you, a wall in front).

### 6. "Make the sound"
Copy `episodes/example/sound.py` (it reads the keyframes from `scene.js` by itself) and place the one-off sounds at their moments (`k.thump`, `k.whoosh`, `k.jet_pass`, `k.bell`). Wind follows your speed and fades where there's no air. Then `python3 episodes/<name>/sound.py out/<name>.wav`.

### 7. "Render the full video"
`node scripts/render.mjs <name> out/<name>.mp4` (60 fps with motion blur; it prints how many minutes are left; it takes about 7 minutes per minute of video on a recent laptop, so start it and walk away), then `node scripts/mux.mjs out/<name>.mp4 out/<name>.wav out/<name>_final.mp4`.
If it says SwiftShader, Chrome is not using the graphics card: on Windows set Chrome to "High performance" in Settings → System → Display → Graphics, then run it again.

### 8. "Package it"
Write `episodes/<name>/upload.md`: the title in the channel's formula ("What If You ___ and Couldn't Stop?"), a 2-line description with the sources, 5 tags, and the best frame for the thumbnail (render it with `--stills`). Keep every upload over 8 minutes so YouTube can put ads in the middle (with `SPEED`, set it to 1 for the upload if the video comes out shorter).

## Never let the picture shake
- **Steady camera:** no sway, no bob, no drift. Through a window or over a town, even half a degree of slow rocking makes thin lines wobble.
- **60 fps + motion blur:** the renderer makes 60 frames per second and blends 4 moments into every frame (`--fps 60 --blur 4`, the defaults). At 30 fps with sharp frames, busy ground (roads, rows of houses, fields) steps instead of flowing (judder).
- **Camera:** `PITCH` / `YAW` go through ONE smooth curve (`monotone()`, see `episodes/float-up/scene.js`), never a separate ease per point (that makes the view lurch and stop at every point). Keep turns under about 12 degrees per second, and no fast bob (one slow float only).
- **Shadows:** a fixed shadow area per part of the trip (room, roof, town). A shadow area that follows the camera or changes size every frame makes every shadow edge crawl.
- **No tiny repeating detail:** rows of thin shadows (a picket fence), thin road dashes, one-pixel dots (dust, far trees) shimmer as you move. Fences don't cast shadows, dashes are wide and few, no dust, no scattered field trees.
- **Flat ground layers never fight:** fields, river, roads and lawn lie millimetres apart; they don't write depth and are drawn in a fixed order on top of the ground (`layer()` in `town.js`). Never stack two flat pieces at the same height.
- **No speed streaks**, no dust.
- **Big objects you fly towards** (the Moon, a planet) sit on your path or are placed from the last frame's view, so they grow instead of sliding sideways.

## Five things that make it look premium (check every still)
1. **Light:** a low golden sun with long shadows (`SUN` in `stage.js`), never a flat midday sun.
2. **Air:** haze that grows with height (`FOG` in the frame function), so far things fade like real air.
3. **A body:** your own hands at the bottom of the screen (`hands.js`, a real rigged hand model). Never hands built from boxes.
4. **No long black or white screens:** going through a ceiling or a cloud lasts under a second.
5. **A readable number:** the soft shadow behind the readout (`#scrim` in `index.html`) keeps it readable over white clouds.

## If something breaks
- Black picture or "SwiftShader": the graphics card isn't used (see step 7).
- Something in the scene looks wrong: render a side view (step 5).
- Out of usage: wait for the reset, then type "continue".
- The skill isn't found: you opened Claude Code in the wrong folder.
- Red text in the terminal: read it, fix the cause, don't just retry.
