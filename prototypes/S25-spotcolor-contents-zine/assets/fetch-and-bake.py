import io, json, os, time, urllib.parse, urllib.request
import numpy as np
from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = False
ASSETS = r'D:\Web\style\prototypes\S25-spotcolor-contents-zine\assets'
MAXW, GRAIN = 1400, 0.08
TARGET = 255 * GRAIN
UA = {'User-Agent': 'S25-prototype-builder/1.0'}
rng = np.random.default_rng(25)


def get(url, timeout=60):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def thumb_url(title):
    api = ('https://commons.wikimedia.org/w/api.php?action=query&format=json&titles='
           + urllib.parse.quote(title) + '&prop=imageinfo&iiprop=url&iiurlwidth=1400')
    d = json.loads(get(api))
    page = list(d['query']['pages'].values())[0]
    return page['imageinfo'][0]['thumburl']


def valid(path):
    try:
        with Image.open(path) as im:
            im.load()
        return True
    except Exception:
        return False


credits = json.load(open(os.path.join(ASSETS, 'credits.json'), encoding='utf-8-sig'))
log = []
for c in credits:
    name = c['file'][:-4]
    out = os.path.join(ASSETS, name + '.jpg')
    new = os.path.join(ASSETS, name + '.new.jpg')
    fresh = os.path.exists(new) and valid(new)
    if not fresh:
        if os.path.exists(new):
            os.remove(new)
        for attempt in range(3):
            try:
                blob = get(thumb_url(c['title']), timeout=90)
                with open(new, 'wb') as fh:
                    fh.write(blob)
                if valid(new) and os.path.getsize(new) > 40000:
                    fresh = True
                    break
            except Exception as e:
                log.append(f'{name} download attempt {attempt + 1} failed: {type(e).__name__}')
            time.sleep(2)
    read = new if fresh else out
    im = Image.open(read).convert('RGB')
    w, h = im.size
    if w > MAXW:
        im = im.resize((MAXW, max(1, round(h * MAXW / w))), Image.LANCZOS)
    arr = np.asarray(im).astype(np.float32)
    prior = 0.0 if fresh else 13.5
    sigma = float(np.sqrt(max(0.0, TARGET ** 2 - prior ** 2)))
    fine = rng.normal(0.0, sigma * 0.70, arr.shape[:2]).astype(np.float32)
    coarse = rng.normal(0.0, sigma * 0.70, (arr.shape[0] // 4 + 1, arr.shape[1] // 4 + 1)).astype(np.float32)
    coarse = np.asarray(Image.fromarray(coarse, mode='F').resize((arr.shape[1], arr.shape[0]), Image.BICUBIC)).astype(np.float32)
    noise = fine + coarse
    res = Image.fromarray(np.clip(arr + noise[..., None], 0, 255).astype(np.uint8), 'RGB')
    res.save(out, 'JPEG', quality=84, optimize=True, progressive=True)
    if fresh and os.path.exists(new):
        os.remove(new)
    total = float(np.sqrt(noise.std() ** 2 + prior ** 2))
    log.append({'file': name + '.jpg', 'source': 'fresh download' if fresh else 'previous build',
                'size': f'{res.size[0]}x{res.size[1]}', 'bytes': os.path.getsize(out),
                'total_grain_sigma': round(total, 2), 'total_pct_of_255': round(total / 255 * 100, 2)})
print(json.dumps(log, indent=1, ensure_ascii=False))
