# What if… couldn't stop (made with code)

This folder makes "What if you ___ and couldn't stop?" videos entirely on this computer: one first-person three.js shot rendered frame by frame, a readout with real numbers, sound made in code. No AI video, no voice.
The workflow is the skill in `.claude/skills/what-if-3d/SKILL.md`. Read it before doing anything.

- Smallest episode: `episodes/example` (38 s). Copy it for new ones.
- Check stills before every full render: `node scripts/render.mjs <episode> out/stills --stills 0,600,1200` then `python3 scripts/sheet.py out/stills out/sheet.jpg`.
- Full video: `node scripts/render.mjs <episode> out/<episode>.mp4`, sound: `python3 episodes/<episode>/sound.py out/<episode>.wav`, join: `node scripts/mux.mjs out/<episode>.mp4 out/<episode>.wav out/<episode>_final.mp4`.
- New video, new chat.
