# S01 红黑斜排报 · 素材来源与署名

页面（`index.html` / `style.css`）引用的每一个位图都在本表里。**没有任何远程资源**：`index.html`、`style.css` 里不存在 http(s) 的 `src` 或 `url()`；字体走 `prototypes/_fonts/` 自托管缓存。

## 档案照片 → 85 线双色半调位图

照片全部来自 Wikimedia Commons（公有领域 / CC BY / CC BY-SA 白名单），抓取脚本 `build/fetch-assets.ps1`
（`action=query&generator=search&gsrnamespace=6&prop=imageinfo`，同时取 `extmetadata` 里的许可与权利人，许可不在白名单的候选直接跳过），原图落在 `build/raw/`。
再由 `build/bake-plates-s01.py` 转成两色半调：红版吃中间调（网角 15°）、黑版吃暗部（网角 75°），红版整体偏移 1.5px 模拟套印不准，上下两端冲胶片齿孔，最后压一层 4% 颗粒。
产出是真实位图 PNG（1080px 宽，有真实分辨率），不是 CSS 插值，也不是 SVG 描摹。

| 产出文件 | 页面里用在哪 | 原件（Commons 文件页，可逐张复核许可） | 权利人 | 许可 | 原始像素 |
| --- | --- | --- | --- | --- | --- |
| `assets/halftone-01-composing-room.png` | 档案图版第 1 张（跨栏主图） | [HBL-newspaper-composition-room-1934.jpg](https://commons.wikimedia.org/wiki/HBL-newspaper-composition-room-1934.jpg) | Hufvudstadsbladet | CC BY 4.0 | 6075x4506 |
| `assets/halftone-02-pressroom.png` | 档案图版第 2 张 | [Impressora Marinoni e máquina de linotipo na oficina gráfica de O Taquaryense.jpg](https://commons.wikimedia.org/wiki/Impressora_Marinoni_e_máquina_de_linotipo_na_oficina_gráfica_de_O_Taquaryense.jpg) | João V Souza P | CC BY 4.0 | 3024x3106 |
| `assets/halftone-03-type-case.png` | 档案图版第 3 张 | [Lead type case (25598835882).jpg](https://commons.wikimedia.org/wiki/Lead_type_case_(25598835882).jpg) | Thomas Quine | CC BY 2.0 | 5472x3648 |
| `assets/halftone-04-rotary-1932.png` | 档案图版第 4 张 | [Rotary printing press machine, Asahi-Shinbun, 1932.jpg](https://commons.wikimedia.org/wiki/Rotary_printing_press_machine,_Asahi-Shinbun,_1932.jpg) | 未署名（Commons 上传者） | Public domain | 8048x5558 |
| `assets/halftone-05-hearing.png` | 档案图版第 5 张 | [S.R.O. sign out as Monopoly Committee opens hearings. Washington, D.C., Dec. 1. Standing room only was the order today as the Temporary Economic Committee, Joint Legislative-Executive Body LCCN2016874466.jpg](https://commons.wikimedia.org/wiki/S.R.O._sign_out_as_Monopoly_Committee_opens_hearings._Washington,_D.C.,_Dec._1._Standing_room_only_was_the_order_today_as_the_Temporary_Economic_Committee,_Joint_Legislative-Executive_Body_LCCN2016874466.jpg) | Harris & Ewing, photographer | Public domain | 9953x7908 |
| `assets/halftone-06-linotype.png` | 档案图版第 6 张（跨栏收尾） | [Linotype composing machine and some of the photographic staff at Woodalls Newspapers (1527528).jpg](https://commons.wikimedia.org/wiki/Linotype_composing_machine_and_some_of_the_photographic_staff_at_Woodalls_Newspapers_(1527528).jpg) | Geoff Charles | CC BY-SA 4.0 | 1828x1200 |
| `assets/halftone-07-mergenthaler.png` | —（备用） | [Ottmar Mergenthaler, at approximately 45 years old.jpg](https://commons.wikimedia.org/wiki/Ottmar_Mergenthaler,_at_approximately_45_years_old.jpg) | Adam Cuerden | Public domain | 6421x7687 |

> 这几张是印刷史与听证会现场的档案照片，用来验证规格字段 6④「档案照片转 85 线粗网半调位图，
> `#C1121F` 与 `#1A1614` 双色套印偏移 1.5px，边缘保留胶片齿孔与手写编号」的实现方式；
> 页面文案里的档案号（`HBL-1934-057` 等）是版面上的排版元素，不是 Commons 的原始编号，复核许可以上表的文件页为准。

## 程序化生成的纹理与光标（无第三方来源）

| 产出文件 | 生成方式 |
| --- | --- |
| `assets/paper-grain.png` | 200×200 未漂白纸纹平铺：高斯噪声 + 横向纤维 + 纸屑，**硬顶 4% 不透明度**（规格字段 11 的原文数值）。生成器 `build/bake-plates.py: tex_paper()`，可直接复算。 |
| `assets/cursor-fold.png` | 24×24 折角箭头光标，方头线帽、端点落 2 单位栅格，只用在折角导读区域（CSS `cursor: url(...)`）。生成器 `build/bake-plates-s01.py: fold_cursor()`。 |

## 复算方式

```
build/fetch-assets.ps1     # Commons 抓取（许可白名单 + 权利人与原始像素落盘到 build/raw/credits.json）
build/bake-plates-s01.py   # 档案照片 → assets/halftone-*.png（85 线双色半调）
build/bake-plates.py --textures-only   # 重烘 assets/paper-grain.png（4% 上限）
```

本表的比例与许可字段直接读上面两个 `credits.json`，不手抄，改动抓取脚本后重跑本脚本即可刷新。
