"""Study a reference video: download it (for study only, never upload it) and make contact sheets.
python3 scripts/study.py <youtube link> <name>
-> ref/<name>/video.mp4, ref/<name>/start_*.jpg (one frame per second, first 60 s),
   ref/<name>/whole_*.jpg (one frame every 10 s), ref/<name>/info.json"""
import sys, os, subprocess, json, glob
from PIL import Image, ImageDraw
link, name = sys.argv[1], sys.argv[2]
out = os.path.join('ref', name); os.makedirs(out, exist_ok=True)
video = os.path.join(out, 'video.mp4')
if not os.path.exists(video):
    subprocess.run(['yt-dlp', '-f', 'bv*[height<=720][ext=mp4]/b[height<=720]', '-o', video, '--write-info-json', '--no-playlist', link], check=True)
ff = subprocess.run(['node', '-e', "import('ffmpeg-static').then(m => console.log(m.default))"], capture_output=True, text=True).stdout.strip()
def frames(rate, start, dur, tag):
    d = os.path.join(out, 'frames_' + tag); os.makedirs(d, exist_ok=True)
    subprocess.run([ff, '-y', '-loglevel', 'error', '-ss', str(start), '-t', str(dur), '-i', video, '-vf', f'fps={rate},scale=640:-2', os.path.join(d, '%05d.jpg')], check=True)
    return sorted(glob.glob(os.path.join(d, '*.jpg'))), 1 / rate, start
def sheets(files, step, start, tag, per=12, cols=3):
    for k in range(0, len(files), per):
        chunk = files[k:k + per]; im0 = Image.open(chunk[0]); W, H = im0.size
        S = Image.new('RGB', (W * cols, H * ((len(chunk) + cols - 1) // cols)), '#111'); d = ImageDraw.Draw(S)
        for i, f in enumerate(chunk):
            x, y = (i % cols) * W, (i // cols) * H; S.paste(Image.open(f), (x, y))
            sec = start + (k + i + 0.5) * step  # ffmpeg's fps filter takes the frame from the middle of each step (checked: fps=0.1 gives 5, 15, 25 s)
            d.rectangle((x, y, x + 70, y + 18), fill='#000'); d.text((x + 4, y + 3), f'{int(sec // 60)}:{sec % 60:04.1f}', fill='#ffd84d')
        S.save(os.path.join(out, f'{tag}_{k // per + 1:02d}.jpg'), quality=85)
f1 = frames(1, 0, 60, 'start'); sheets(*f1, 'start')
f2 = frames(0.1, 0, 3600, 'whole'); sheets(*f2, 'whole')
info = {}
for j in glob.glob(os.path.join(out, '*.info.json')):
    m = json.load(open(j)); info = {k: m.get(k) for k in ('title', 'channel', 'view_count', 'duration', 'upload_date', 'description')}
json.dump(info, open(os.path.join(out, 'info.json'), 'w'), indent=1)
print('done:', out, '- now look at every start_*.jpg and whole_*.jpg sheet')
