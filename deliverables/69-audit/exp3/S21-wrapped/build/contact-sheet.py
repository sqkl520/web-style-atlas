import json, os, sys
from PIL import Image, ImageDraw

CAND = r'D:\Web\style\prototypes\S21-interlocking-release-book\assets\_cand'
only = sys.argv[1:]
files = sorted(f for f in os.listdir(CAND) if f.lower().endswith('.jpg') and f != 'sheet.jpg')
if only:
    files = [f for f in files if f.split('-')[0] in only]
COLS, CW, CH = 5, 330, 250
rows = (len(files) + COLS - 1) // COLS
sheet = Image.new('RGB', (COLS * CW, max(1, rows) * CH), (24, 24, 24))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(os.path.join(CAND, f)).convert('RGB')
    im.thumbnail((CW - 8, CH - 24), Image.LANCZOS)
    x = (i % COLS) * CW + 4
    y = (i // COLS) * CH + 4
    sheet.paste(im, (x, y))
    d.text((x + 2, y + CH - 18), f'{i}: {f}', fill=(255, 255, 255))
out = os.path.join(CAND, 'sheet.jpg')
sheet.save(out, 'JPEG', quality=80)
print(out, sheet.size)
print('\n'.join(f'{i}: {f}' for i, f in enumerate(files)))
