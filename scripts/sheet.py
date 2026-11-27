"""Put still pictures side by side in one contact sheet, with their times, so you can check them all at once.
python3 scripts/sheet.py out/stills out/stills/sheet.jpg"""
import sys, glob, os
from PIL import Image, ImageDraw
src, dst = sys.argv[1], sys.argv[2]
fs = sorted([f for f in glob.glob(os.path.join(src, '*.jpg')) if 'sheet' not in f], key=lambda f: int(os.path.basename(f)[1:-4]))
W, H, cols = 640, 360, 3
rows = (len(fs) + cols - 1) // cols
S = Image.new('RGB', (W * cols, H * rows), '#111'); d = ImageDraw.Draw(S)
for i, f in enumerate(fs):
    x, y = (i % cols) * W, (i // cols) * H
    S.paste(Image.open(f).resize((W, H)), (x, y))
    sec = int(os.path.basename(f)[1:-4]) / 30
    d.rectangle((x, y + H - 22, x + 90, y + H), fill='#000'); d.text((x + 6, y + H - 18), f'{int(sec // 60)}:{sec % 60:04.1f}', fill='#ffd84d')
S.save(dst, quality=88); print('wrote', dst, len(fs), 'stills')
