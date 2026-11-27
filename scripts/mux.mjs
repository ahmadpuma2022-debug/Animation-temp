// Join the silent render and the sound into the final video.
//   node scripts/mux.mjs out/float-up.mp4 out/float-up.wav out/float-up_final.mp4
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
const [video, audio, out] = process.argv.slice(2);
if (!out) { console.log('usage: node scripts/mux.mjs <video.mp4> <sound.wav> <final.mp4>'); process.exit(1); }
const r = spawnSync(ffmpegPath, ['-y', '-loglevel', 'error', '-i', video, '-i', audio, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', out], { stdio: 'inherit' });
console.log(r.status === 0 ? `done: ${out}` : 'ffmpeg failed');
