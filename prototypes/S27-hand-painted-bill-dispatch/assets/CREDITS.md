# 素材来源与署名

> 本文件由 `prototypes/_build/write-credits.mjs` 从本目录及 `build/` 下已有的 `credits.json` 汇总生成，**不是手抄**。
> 下表是唯一权威，与 `assets/credits.json`（扁平数组）同源。逐主机连通性真值单一来源见 `prototypes/_CONTRACT.md` §10.1，本文不重复网络状态断言。
>
> **2026-10-25 换图说明（四张）**：`plate-jogan-1950` / `plate-anokhi-ada-1948` / `plate-prithvi-vallabh-1943` / `plate-aanchal-1960` 是本会话按 Commons `imageinfo` 现抓原图、再用 `deliverables/59-scratch/s27-duotone.mjs` 压成 `#E8D7B5`（纸）/ `#221C10`（墨）双色调的成品，**未裁边**（四张要看的证据都在纸沿）。原图尺寸依次为 4994×6732、1000×1454、1019×1500、1944×3000，原图留在 `deliverables/59-scratch/s27-originals/`。
> 同时**退役并删除**了本案目录下三个文件（它们在其原属方案 S19／S22 的目录里仍然存在，未被改动）：`reuse-s11-doc-02-carbon.jpg`（实为 1980 年美国磁带库空白表单，与旧图注「复写三联单」不符）、`reuse-s11-doc-07-copy.jpg`（实为 Ethel Rosenberg 打字信第 2 页，无旧图注所称的档号与装订孔）、`reuse-s01-plate-05-hearing.jpg`（实为会场全景新闻照，不是手写公告牌）。
> 现在图版区 7 个槽位对 7 个不同文件——原先 Figaro 那一张同时占了 head 与 `plate--f` 两槽。

## 一、真实照片

| 文件 | 标题 | 作者 | 许可 | 来源页 |
| --- | --- | --- | --- | --- |
| `reuse-s16-plate-01-figaro-manifesto.jpg` | Manifesto futurismo Le Figaro.jpg | Le Figaro | Public domain | [原件页](https://commons.wikimedia.org/wiki/File%3AManifesto%20futurismo%20Le%20Figaro.jpg) |
| `reuse-s16-plate-02-parole-liberta.jpg` | Filippo Tommaso Marinetti - Parole in Liberta 1932 C.jpg | Filippo Tommaso Marinetti | Public domain | [原件页](https://commons.wikimedia.org/wiki/File%3AFilippo%20Tommaso%20Marinetti%20-%20Parole%20in%20Liberta%201932%20C.jpg) |
| `reuse-s11-doc-05-typescript.jpg` | Jan. 1904 George Sterling and Ambrose Bierce comments on A Wine of Wizardry typescript.jpg | George Sterling and Ambrose Bierce created this document in January 1904, 119 years ago. It is in the public domain. The poem was published in September 1907. | Public domain | [原件页](https://commons.wikimedia.org/wiki/File:Jan._1904_George_Sterling_and_Ambrose_Bierce_comments_on_A_Wine_of_Wizardry_typescript.jpg) |
| `plate-anokhi-ada-1948.jpg` | Anokhi Ada (1948 film).jpg | Mehboob Productions | Public domain | [原件页](https://commons.wikimedia.org/wiki/File:Anokhi_Ada_(1948_film).jpg) |
| `plate-prithvi-vallabh-1943.jpg` | Prithvi Vallabh 1943 poster.jpg | Minerva Movietone Production | Public domain | [原件页](https://commons.wikimedia.org/wiki/File:Prithvi_Vallabh_1943_poster.jpg) |
| `plate-aanchal-1960.jpg` | Aanchal (1960 film).jpg | Panchdeep Chitra | Public domain | [原件页](https://commons.wikimedia.org/wiki/File:Aanchal_(1960_film).jpg) |
| `plate-jogan-1950.jpg` | Jogan film poster.jpg | National Film Archive of India | Public domain | [原件页](https://commons.wikimedia.org/wiki/File:Jogan_film_poster.jpg) |

四张 `plate-*` 的许可均为 Commons 上的 **Public domain**（extmetadata `LicenseShortName`，2026-10-25 现取），不是 NC / ND，符合本案「只用印件与打字稿的原件翻拍」的取用纪律。

## 二、程序化纹理（生成物，非照片）

| 文件 | 生成器 | 参数 |
| --- | --- | --- |
| `texture-cloth-fold.png` | `streak` | `{"seed":23,"angle":1.35,"count":90,"alpha":0.13}` |
| `texture-stone-grain.png` | `grain` | `{"seed":81,"density":0.5,"alpha":0.07}` |
| `texture-paint-blotch.png` | `blotch` | `{"seed":83,"count":8,"rmin":10,"rmax":44,"alpha":0.14,"color":"#0e6258"}` |

这些是代码生成的纹理，**不是照片**，按 `prototypes/_build/make-textures.py` 与 `build/texture-job.json` 可逐字节复算，无第三方权利。

## 三、字体

页面字体不用远程 URL（契约 §4）；实际自托管位置以本案 style.css 的 @font-face 引用为准——多数案在 `../_fonts/`，个别案（S04/S07/S08/S21）在案目录内另有私有字体切片，搬走时需一并带走（50 号实测，本句从旧版“全部在 _fonts”改正）。
