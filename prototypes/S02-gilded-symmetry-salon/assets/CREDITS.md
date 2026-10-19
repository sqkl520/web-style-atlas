# 素材来源与许可 · S02 鎏金对称厅（Gilded Symmetry Salon）

本页在运行期**不请求任何外部域名**：`index.html` 与 `style.css` 里没有一条 `http://` 或 `https://`
的 `src` / `url()`，字体来自 `../_fonts/`（自托管 woff2 缓存），图片全部是本目录下的本地文件。
原始下载只发生在构建期，产物已经烘进位图，不再需要网络。

---

## 1. 真实照片（5 张，全部来自 Wikimedia Commons）

经构建期处理：按版面目标长宽比中心裁切 → 自动色阶（1%–99.5% 分位拉伸）→ S 曲线 →
亮度映射到 `#0B0B0F` … `#6B5410` … `#B8860B` 的双色调 → 顶部 12% 高光溢出 → 四角减光 28% →
细网点 → JPEG。脚本：`build/bake-prints.py`；尺寸与色阶记录：`build/asset-sizes.json`。
**衍生图沿用原图的许可**（CC BY-SA 3.0 那张的衍生图同样以 CC BY-SA 3.0 提供）。

| 交付文件 | Commons 文件 | 作者 | 许可 | 原图地址 |
| --- | --- | --- | --- | --- |
| `assets/garnier-staircase.jpg` | [File:Opera Garnier Grand Escalier.jpg](https://commons.wikimedia.org/wiki/File:Opera_Garnier_Grand_Escalier.jpg) | Benh LIEU SONG | CC BY-SA 3.0 | https://upload.wikimedia.org/wikipedia/commons/1/18/Opera_Garnier_Grand_Escalier.jpg |
| `assets/ormolu-gilt-bronze.jpg` | [File:Mantelpiece clock by Deniére et Matelin Early 19th c.jpg](https://commons.wikimedia.org/wiki/File:Mantelpiece_clock_by_Deni%C3%A9re_et_Matelin_Early_19th_c.jpg) | Deniére et Matelin 工坊（巴黎） | Public domain | https://upload.wikimedia.org/wikipedia/commons/3/3f/Mantelpiece_clock_by_Deni%C3%A9re_et_Matelin_Early_19th_c.jpg |
| `assets/silver-gilt-case.jpg` | [File:Snuff box (AM 2014.17.2-1).jpg](https://commons.wikimedia.org/wiki/File:Snuff_box_(AM_2014.17.2-1).jpg) | 未署名（Commons 记为 Unknown author；奥克兰博物馆藏 AM 2014.17.2-1） | CC BY 4.0 | https://upload.wikimedia.org/wikipedia/commons/0/0c/Snuff_box_%28AM_2014.17.2-1%29.jpg |
| `assets/paris-1925-expo.jpg` | [File:Exposition Internationale des Arts Décoratifs & Industriels Modernes, couverture Soirée du 28 Octobre 1925, Paris Musées](https://commons.wikimedia.org/wiki/File:Exposition_Internationale_des_Arts_D%C3%A9coratifs_%26_Industriels_Modernes_couverture_Soir%C3%A9e_du_28_Octobre_1925_page,_Paris_Mus%C3%A9es_20230909214932.jpg) | Anonyme, imprimeur | CC0 | https://upload.wikimedia.org/wikipedia/commons/b/b3/Exposition_Internationale_des_Arts_D%C3%A9coratifs_%26_Industriels_Modernes_couverture_Soir%C3%A9e_du_28_Octobre_1925_page%2C_Paris_Mus%C3%A9es_20230909214932.jpg |
| `assets/gold-tooled-cover.jpg` | [File:Bookbinding tools belonging to David Nicol.jpg](https://commons.wikimedia.org/wiki/File:Bookbinding_tools_belonging_to_David_Nicol.jpg) | Edinburgh City of Print | CC BY 2.0 | https://upload.wikimedia.org/wikipedia/commons/8/8f/Bookbinding_tools_belonging_to_David_Nicol.jpg |

许可构成：公有领域 1 张、CC0 1 张、CC BY 2.0 1 张、CC BY 4.0 1 张、CC BY-SA 3.0 1 张。
页内每张图版下方都带一行署名；图片一律有 `alt`，不是装饰性占位。

原始下载（1920px 长边）留在 `assets/_raw/`，供重新烘焙使用，来源与许可与上表一一对应：

```
_raw/garnier-staircase.jpg   ← Opera Garnier Grand Escalier.jpg
_raw/ormolu-gilt-bronze.jpg  ← Mantelpiece clock by Deniére et Matelin Early 19th c.jpg
_raw/silver-gilt-case.jpg    ← Snuff box (AM 2014.17.2-1).jpg
_raw/paris-1925-expo.jpg     ← Exposition Internationale … 1925 … Paris Musées
_raw/gold-tooled-cover.jpg   ← Bookbinding tools belonging to David Nicol.jpg
```

抓取脚本 `assets/fetch-assets.ps1` 走 Commons API，带 UA、重试与候选回退，并清理缩略图 URL 上的
`?utm_source=` 跟踪参数；`assets/credits.json` 是脚本落盘的机器可读版署名表（上表即由它整理）。

## 2. 程序化生成的位图（本页实际引用）

全部由脚本用 Pillow 画出，无第三方版权；分辨率真实（不是放大出来的假图），也不是 SVG 冒充照片。

| 文件 | 生成脚本 | 用途与画法 |
| --- | --- | --- |
| `assets/foil-plate@1x.png` / `@2x.png` | `build/make-plates.py` | 烫金版纹样本体。左半取原版、右半取绕中缝 180° 的相位取样，两半共用这一张位图（`background-size: 200% auto`）。装饰艺术线脚：同心弧 + 阶梯直线段，1–2px 线宽，自下而上密度递减。 |
| `assets/card-grain.png` | `build/make-plates.py` | 炭黑卡纸纤维，128px 平铺，给地面色一档极轻的颗粒。 |
| `assets/gold-grain.png` | `build/make-plates.py` | 金箔压印颗粒，叠在级块的金色填充上，模拟金墨不匀与网点。 |
| `assets/leak-patch@2x.png` | `build/make-plates.py` | 漏金缺口：未上金的漏白 + 卡纸毛边，缺口下缘留一道未压实的金线。 |

## 3. 并行构建留下的备用位图（本页**未引用**，保留以便比对）

与上面同源思路、另一套命名，由 `build/make-salon-assets.py`（`salon-plate`、`card-fiber`、
`foil-grain`、`leak-gap`）与 `build/bake-duotone.py`（5 张双色调器物照）生成。它们与第 1、2 节的
素材不冲突，只是没被当前 `index.html` / `style.css` 引用，列在这里以免被误认为来历不明：

```
assets/salon-plate@1x.png     assets/salon-plate@2x.png
assets/card-fiber.png         assets/foil-grain.png        assets/leak-gap@2x.png
assets/hall-01-garnier.jpg    assets/hall-02-ormolu.jpg    assets/hall-03-case.jpg
assets/hall-04-expo1925.jpg   assets/hall-05-tools.jpg
```

`hall-0N-*.jpg` 与第 1 节是同 5 张 Commons 原图的另一种双色调烘焙（脚本 `build/bake-duotone.py`），
许可同第 1 节；其余为纯生成位图。核对脚本：`build/check-assets.py`（尺寸 / alpha 覆盖 / 亮度统计）。

## 4. 字体（自托管，OFL 1.1）

woff2 与 `@font-face` 位于共享缓存 `prototypes/_fonts/`（本目录不含字体文件），
`index.html` 只 `link` 了三份 CSS，页面运行期不外连：

| 字族 | 角色 | 许可 |
| --- | --- | --- |
| Bodoni Moda | 拉丁标题与数字（Didone 发丝横线） | SIL Open Font License 1.1 |
| Noto Serif SC（思源宋体） | 中文标题、条款与正文 | SIL Open Font License 1.1 |
| IBM Plex Mono | 仅 `<code>` 内的编号、尺寸、时段 | SIL Open Font License 1.1 |

禁用字族（Inter / Roboto / Arial / Helvetica / system-ui 等）在 `index.html`、`style.css`
里一次都没有出现。

## 5. 文案与数据

器物台账、尺寸、压印级、时段与 `BOOK-409` 冲突文案都来自方案 2 的字段 12（成品文案），
其余说明文字是为把字段 3/5/6/7 讲清楚而写的本页自述，不是编造的品牌宣传语。
本页是可运行原型：台账数字与预约时段为示例数据，取用真实器物的名称与形制作参照。
