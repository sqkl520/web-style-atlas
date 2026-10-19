# 素材来源与署名 — S06 昭和喫茶账（Showa Kissaten Ledger）

本目录下的位图分两类：**真实照片**（Wikimedia Commons 抓取，逐张署名）与
**程序化生成的印刷纹理**（Python + Pillow，无外部来源）。
本文件由 `build/write-credits.py` 依据 `assets/credits.json` ∪ 页面真实引用生成，请勿手改。

## 1 真实照片（珂罗版双色处理的原稿）

原稿保存在 `assets/origin/`（未经处理，仅供复核分色是否忠实）。
页面用的是 `assets/plate-*.jpg`：60 线连续调网点、`#85572A` 与 `#241A12` 双色、
边缘 12% 晕染外溢，构建脚本 `build/make-plates.py`。

| 页面文件 | 原稿 | 作者 | 授权 | 原始尺寸 | 来源页 | 原始文件 |
| --- | --- | --- | --- | --- | --- | --- |
| `plate-beans.jpg`（996×664） | `origin/beans-roasting.jpg` | A S M Jobaer | CC BY-SA 4.0 | 4898×3265 | [Roasted coffee beans on the surface. 01.jpg](https://commons.wikimedia.org/wiki/File:Roasted_coffee_beans_on_the_surface._01.jpg) | [Roasted_coffee_beans_on_the_surface._01.jpg](https://upload.wikimedia.org/wikipedia/commons/3/38/Roasted_coffee_beans_on_the_surface._01.jpg) |
| `plate-counter.jpg`（840×560） | `origin/kissaten-counter.jpg` | Tail furry | CC BY-SA 4.0 | 4032×3024 | [Shinwa Honten Branch, Coffee Club, Niigata, Niigata, Japan, August 2024.jpg](https://commons.wikimedia.org/wiki/File:Shinwa_Honten_Branch,_Coffee_Club,_Niigata,_Niigata,_Japan,_August_2024.jpg) | [Shinwa_Honten_Branch%2C_Coffee_Club%2C_Niigata%2C_Niigata%2C_Japan%2C_August_2024.jpg](https://upload.wikimedia.org/wikipedia/commons/3/32/Shinwa_Honten_Branch%2C_Coffee_Club%2C_Niigata%2C_Niigata%2C_Japan%2C_August_2024.jpg) |
| `plate-cup.jpg`（996×664） | `origin/cup-and-saucer.jpg` | Susanne Nilsson from Trelleborg, Sweden | CC BY-SA 2.0 | 6000×4000 | [Time for Coffee (34763890300).jpg](https://commons.wikimedia.org/wiki/File:Time_for_Coffee_(34763890300).jpg) | [Time_for_Coffee_%2834763890300%29.jpg](https://upload.wikimedia.org/wikipedia/commons/0/01/Time_for_Coffee_%2834763890300%29.jpg) |
| `plate-grinder.jpg`（552×552） | `origin/hand-grinder.jpg` | Derzsi Elekes Andor | CC BY-SA 3.0 | 4320×3240 | [Kávédaráló (3).JPG](https://commons.wikimedia.org/wiki/File:K%C3%A1v%C3%A9dar%C3%A1l%C3%B3_(3).JPG) | [K%C3%A1v%C3%A9dar%C3%A1l%C3%B3_%283%29.JPG](https://upload.wikimedia.org/wikipedia/commons/b/be/K%C3%A1v%C3%A9dar%C3%A1l%C3%B3_%283%29.JPG) |
| `plate-ledger.jpg`（552×414） | `origin/ledger-paper.jpg` | Pocztowa Kasa Oszczędności (issuing institution); printed designer not identified; personal entries by the depositor and postal clerks; faithful museum digitization | Public domain | 3000×2268 | [Книжка сберегательная № 880054 польской почтово-сберегательной кассы. Незаполненная таблица операций--moneymuseum-by.jpg](https://commons.wikimedia.org/wiki/File:%D0%9A%D0%BD%D0%B8%D0%B6%D0%BA%D0%B0_%D1%81%D0%B1%D0%B5%D1%80%D0%B5%D0%B3%D0%B0%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D0%B0%D1%8F_%E2%84%96_880054_%D0%BF%D0%BE%D0%BB%D1%8C%D1%81%D0%BA%D0%BE%D0%B9_%D0%BF%D0%BE%D1%87%D1%82%D0%BE%D0%B2%D0%BE-%D1%81%D0%B1%D0%B5%D1%80%D0%B5%D0%B3%D0%B0%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9_%D0%BA%D0%B0%D1%81%D1%81%D1%8B._%D0%9D%D0%B5%D0%B7%D0%B0%D0%BF%D0%BE%D0%BB%D0%BD%D0%B5%D0%BD%D0%BD%D0%B0%D1%8F_%D1%82%D0%B0%D0%B1%D0%BB%D0%B8%D1%86%D0%B0_%D0%BE%D0%BF%D0%B5%D1%80%D0%B0%D1%86%D0%B8%D0%B9--moneymuseum-by.jpg) | [%D0%9A%D0%BD%D0%B8%D0%B6%D0%BA%D0%B0_%D1%81%D0%B1%D0%B5%D1%80%D0%B5%D0%B3%D0%B0%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D0%B0%D1%8F_%E2%84%96_880054_%D0%BF%D0%BE%D0%BB%D1%8C%D1%81%D0%BA%D0%BE%D0%B9_%D0%BF%D0%BE%D1%87%D1%82%D0%BE%D0%B2%D0%BE-%D1%81%D0%B1%D0%B5%D1%80%D0%B5%D0%B3%D0%B0%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9_%D0%BA%D0%B0%D1%81%D1%81%D1%8B._%D0%9D%D0%B5%D0%B7%D0%B0%D0%BF%D0%BE%D0%BB%D0%BD%D0%B5%D0%BD%D0%BD%D0%B0%D1%8F_%D1%82%D0%B0%D0%B1%D0%BB%D0%B8%D1%86%D0%B0_%D0%BE%D0%BF%D0%B5%D1%80%D0%B0%D1%86%D0%B8%D0%B9--moneymuseum-by.jpg](https://upload.wikimedia.org/wikipedia/commons/8/88/%D0%9A%D0%BD%D0%B8%D0%B6%D0%BA%D0%B0_%D1%81%D0%B1%D0%B5%D1%80%D0%B5%D0%B3%D0%B0%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D0%B0%D1%8F_%E2%84%96_880054_%D0%BF%D0%BE%D0%BB%D1%8C%D1%81%D0%BA%D0%BE%D0%B9_%D0%BF%D0%BE%D1%87%D1%82%D0%BE%D0%B2%D0%BE-%D1%81%D0%B1%D0%B5%D1%80%D0%B5%D0%B3%D0%B0%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9_%D0%BA%D0%B0%D1%81%D1%81%D1%8B._%D0%9D%D0%B5%D0%B7%D0%B0%D0%BF%D0%BE%D0%BB%D0%BD%D0%B5%D0%BD%D0%BD%D0%B0%D1%8F_%D1%82%D0%B0%D0%B1%D0%BB%D0%B8%D1%86%D0%B0_%D0%BE%D0%BF%D0%B5%D1%80%D0%B0%D1%86%D0%B8%D0%B9--moneymuseum-by.jpg) |
| `plate-siphon.jpg`（552×736） | `origin/siphon-coffee.jpg` | Evelyn-rose | CC0 | 2048×1536 | [Vacuum-coffee-maker-1.jpg](https://commons.wikimedia.org/wiki/File:Vacuum-coffee-maker-1.jpg) | [Vacuum-coffee-maker-1.jpg](https://upload.wikimedia.org/wikipedia/commons/0/03/Vacuum-coffee-maker-1.jpg) |
| `plate-turntable.jpg`（552×736） | `origin/vinyl-turntable.jpg` | Amitbalani | CC0 | 2725×3000 | [Record Player with Cassette & Radio functionality.jpg](https://commons.wikimedia.org/wiki/File:Record_Player_with_Cassette_%26_Radio_functionality.jpg) | [Record_Player_with_Cassette_%26_Radio_functionality.jpg](https://upload.wikimedia.org/wikipedia/commons/a/a0/Record_Player_with_Cassette_%26_Radio_functionality.jpg) |

抓取方式：`assets/fetch-assets.ps1`，走 Wikimedia Commons API
（`action=query&generator=search&gsrnamespace=6&prop=imageinfo`），取 1400px 缩略图，
并逐张记录 `artist` / `license` / `origin` / `page` 到 `assets/credits.json`。

## 2 程序化生成的印刷纹理

| 文件 | 生成方式 |
| --- | --- |
| `cursor-spoon.png` | 程序化生成（Pillow）：20px 咖啡匙轮廓光标，1.2px 线、无填充（当前页面未引用，留在盘上备查） |
| `halftone-dot.png` | 程序化生成（Pillow）：60 线实地网点贴片，64×64，α=7% |
| `ink-mottle.png` | 程序化生成（Pillow + numpy FFT）：珂罗版辊上墨不匀的低频斑块，512×512 无缝拼贴，α≤13% |
| `paper-grain.png` | 程序化生成（Pillow + numpy FFT）：纸纹纤维噪声，384×384 无缝拼贴，α≤16% |
| `stain-ring-a.png` | 程序化生成（Pillow）：同心不规则杯渍环，2 层，外环 6%／内环 14% 不透明度，直径 72px，边缘 1px 深色沉积线 |
| `stain-ring-b.png` | 程序化生成（Pillow）：同心不规则杯渍环，3 层，外环 6%／内环 14% 不透明度，直径 112px，边缘 1px 深色沉积线 |
| `stain-ring-c.png` | 程序化生成（Pillow）：同心不规则杯渍环，2 层，外环 6%／内环 14% 不透明度，直径 140px，边缘 1px 深色沉积线 |

## 3 未采用的候选

`origin/` 中的文件全部被引用；没有被页面引用却留在盘上的原稿一个也没有。
数字（期号、日期、水温、粉量、注水时间、错误码）都是原型里的示例数据，不来自照片。

## 4 字体

字体不经由本目录分发。自托管样式表在 `prototypes/_fonts/css/`，由
`prototypes/_build/fetch-fonts.mjs` 抓取并改写为本地相对路径。S06 引用：
`eb-garamond__400-600.css`（EB Garamond，OFL 1.1）、`literata__400.css`（Literata，OFL 1.1）、
`martian-mono__400-500.css`（Martian Mono，OFL 1.1）、`noto-serif-sc__400-700.css`（思源宋体，OFL 1.1）。

