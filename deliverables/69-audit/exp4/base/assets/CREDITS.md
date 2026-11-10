# 素材来源与署名

> 本文件由 `prototypes/_build/write-credits.mjs` 从本目录及 `build/` 下已有的 `credits.json` 汇总生成，**不是手抄**。
> 本方案建于这份施工规范之前，素材是在当时网络可用时从 Wikimedia Commons 抓取的。

## 一、真实照片

| 文件 | 标题 | 作者 | 许可 | 来源页 |
| --- | --- | --- | --- | --- |
| `plate-letterpress-tan.jpg` | Casse de typographe, Grandjean（musée Champollion） | VIGNERON | CC BY 3.0 | [原件页](https://commons.wikimedia.org/wiki/File:Casse_de_typographe,_Grandjean_-_mus%C3%A9e_Champollion.JPG) |
| `plate-laid-paper.jpg` | Pro Patria watermark（reversed image），Royal Botanic Gardens Melbourne 藏纸样 | 多家纸厂（19 世纪欧洲为主） | public domain | [原件页](https://commons.wikimedia.org/wiki/File:Watermark_RBGV_03.jpg) |
| `plate-seal-carved.jpg` | Stamp seal（赫石印章，阴刻） | Hittite maker | public domain (CC0) | [原件页](https://www.metmuseum.org/art/collection/search/327799) |
| `plate-seal-impression.jpg` | Seal impression in unbaked clay（压印留痕） | Unidentified（Hittite） | public domain (CC0) | [原件页](https://www.metmuseum.org/art/collection/search/327799) |
| `plate-type-metal.jpg` | Embosser at Huntington FL（铸铁书本盲压机） | Jim.henderson | CC0 1.0 | [原件页](https://commons.wikimedia.org/wiki/File:Embosser_at_Huntington_FL_jeh.jpg) |

### 盘上存在但署名表里没有对应记录的位图

- `src-embossstamp.jpg` （323 KB）
- `src-paraguay.jpg` （1168 KB）
- `src-shelving.jpg` （397 KB）
- `src-storagebw.jpg` （315 KB）
- `src-washi.jpg` （604 KB）

## 二、程序化纹理 / 生成物

（本目录没有以 `texture-` 命名的生成物；若有其他生成图版，见 `build/` 下的生成脚本。）

## 三、字体

页面字体不用远程 URL（契约 §4）；实际自托管位置以本案 style.css 的 @font-face 引用为准——多数案在 `../_fonts/`，个别案（S04/S07/S08/S21）在案目录内另有私有字体切片，搬走时需一并带走（50 号实测，本句从旧版“全部在 _fonts”改正）。
