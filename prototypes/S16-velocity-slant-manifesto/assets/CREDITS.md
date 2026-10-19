# S16 速度斜排宣言 · 图版署名与许可

七张图版全部取自 Wikimedia Commons，按抓到时的 `build/raw/credits.json` 原样抄录
（本文件由 `build/write-credits.py` 生成，不要手改）。
每张照片先做 1-bit 高对比阈值化，再沿 12° 斜线撕边，边缘保留 2px 纸纤维毛刺
（`build/bake-plates.py`），落回未漂白宣言纸 `#F7EBCF` 与铅字黑 `#1A1A1A` / 未来派朱红 `#C52C0F`。

本页实际引用 6 张：plate-01-figaro-manifesto.png, plate-02-parole-liberta.png, plate-03-type-case.png, plate-04-metal-type.png, plate-05-albion-press.png, plate-06-composing-stick.png

| 页面文件 | 原始文件 | 作者 | 许可 | 原件尺寸 | 原件页 |
| --- | --- | --- | --- | --- | --- |
| `assets/plate-01-figaro-manifesto.png` | File:Manifesto futurismo Le Figaro.jpg | Le Figaro | Public domain | 1023×1487 | [Commons](https://commons.wikimedia.org/wiki/File%3AManifesto%20futurismo%20Le%20Figaro.jpg) |
| `assets/plate-02-parole-liberta.png` | File:Filippo Tommaso Marinetti - Parole in Liberta 1932 C.jpg | Filippo Tommaso Marinetti | Public domain | 1870×2000 | [Commons](https://commons.wikimedia.org/wiki/File%3AFilippo%20Tommaso%20Marinetti%20-%20Parole%20in%20Liberta%201932%20C.jpg) |
| `assets/plate-03-type-case.png` | File:Type case with movable types for letterpress printing in the Gutenberg Museum, Mainz, Germany (48988492232).jpg | dronepicr | CC BY 2.0 | 4032×3024 | [Commons](https://commons.wikimedia.org/wiki/File%3AType%20case%20with%20movable%20types%20for%20letterpress%20printing%20in%20the%20Gutenberg%20Museum%2C%20Mainz%2C%20Germany%20(48988492232).jpg) |
| `assets/plate-04-metal-type.png` | File:Metal movable type.jpg | Willi Heidelbach | CC BY 2.5 | 2288×1520 | [Commons](https://commons.wikimedia.org/wiki/File%3AMetal%20movable%20type.jpg) |
| `assets/plate-05-albion-press.png` | File:Albion press at the Birkenhead Museum of Printing.jpg | Rodhullandemu | CC BY-SA 4.0 | 4306×3320 | [Commons](https://commons.wikimedia.org/wiki/File%3AAlbion%20press%20at%20the%20Birkenhead%20Museum%20of%20Printing.jpg) |
| `assets/plate-06-composing-stick.png` | File:Composing-stick - Winkelhaken (2311727423).jpg | takomabibelot | CC BY 2.0 | 1464×1440 | [Commons](https://commons.wikimedia.org/wiki/File%3AComposing-stick%20-%20Winkelhaken%20(2311727423).jpg) |

## 题材说明

- `assets/plate-01-figaro-manifesto.png` —— 1909 年 2 月 20 日《费加罗报》头版刊出的《未来主义宣言》，本方案版式机制的出处
- `assets/plate-02-parole-liberta.png` —— 马里内蒂《自由之言》内页，斜排词块与自由排字的实物依据
- `assets/plate-03-type-case.png` —— 谷登堡博物馆的活字字盘，格子里的铅字按字面分格
- `assets/plate-04-metal-type.png` —— 金属活字（字身、字面、字肩），压痕与油墨堆积边都长在这里
- `assets/plate-05-albion-press.png` —— 伯肯黑德印刷博物馆的阿尔比恩手摇压印机
- `assets/plate-06-composing-stick.png` —— 排字手盘（Winkelhaken），一手持盘一手取字，斜排靠它一行行攒

## 程序化素材（非照片，无第三方署名）

- `assets/paper-grain.png` —— 未漂白纸的纤维不匀，384×384 RGBA 噪声，`build/make-textures.py` 生成。
- `assets/cursor-slant.png` —— 12° 倾斜的 2px 十字光标，`build/make-textures.py` 生成。

字体四支（LXGW Marker Gothic / Archivo Black / Noto Serif SC / Fragment Mono）均为 OFL 1.1，
自托管于 `prototypes/_fonts/`，页面内不含任何外链字体请求。
