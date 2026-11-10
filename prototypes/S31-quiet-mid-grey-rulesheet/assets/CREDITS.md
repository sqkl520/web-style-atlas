# S31 静灰尺规页 · 素材来源与署名

页面（`index.html` / `style.css`）引用的每一个位图都在本表里。
**没有任何远程资源**：`index.html`、`style.css` 里不存在 http(s) 的 `src` 或 `url()`；
字体走 `prototypes/_fonts/` 自托管缓存。

## 一、位图（1 张，生成物，不是照片）

| 产出文件 | 页面里用在哪 | 来源 | 许可 | 像素 |
|---|---|---|---|---|
| `assets/ruler-field.png` | 唯一的图位（16:9，真实面积） | **程序化生成**，生成脚本 `deliverables/75-q2/_det/_gen-ruler-texture.mjs` | 本仓库自有（CC0 / 随仓库许可） | 1280×720 |

**为什么这一案没有照片**：`_CONTRACT.md §10` 记录本环境所有图源不可用（Wikimedia/Openverse/pexels 全部 ECONNRESET 或 403），
只能从已有语料交叉复用或用 NASA 补。而本案的定位正是「店主手上只有文字与价格、没有可用照片」——
那个处境在 30 案里**一个正解都没有**（全库 `minPics` 最小是 4，实测）。
所以本案刻意不采用任何照片，用一张确定性生成的尺规纹理当唯一的图位。

## 二、这张图是怎么生成的

`deliverables/75-q2/_det/_gen-ruler-texture.mjs` 是一个**确定性**脚本：
固定种子（20261110）的线性同余噪声做纸纤维、固定几何画刻度、Node 内置 zlib 编码 PNG。
同一份脚本重跑得到**逐字节相同**的文件（无时间戳、无随机源）。

参数：

| 项 | 值 |
|---|---|
| 尺寸 | 1280×720（16:9） |
| 底色 | `#6E6A63`（= `--paper-deep`） |
| 主刻度 | 每 **60px**，长 34px，3px 宽，`#1C1B19`（= `--ink`） |
| 次刻度 | 每 **12px**，长 12px，2px 宽，`#3D3A35` |
| 纸纤维 | 约 10 万点，3.5% 不透明度，两种颜色交替 |

**可直接复核的判据**：`git show` 这份脚本 + 重跑 + `sha256sum` 对比。
若要换刻度密度，改脚本里的 `60` / `12` 两个数即可，页面 `style.css` 的 `.ruler`
用的是同一组数（60px 主 / 12px 次），两处必须同步改——这一点写在两边的注释里。

## 三、字体

| 用途 | 族 | 来源 |
|---|---|---|
| 中文正文 | Noto Serif SC 400 / 700 | `prototypes/_fonts/css/noto-serif-sc__400-700.css`（自托管） |
| 拉丁标题 | Jost 500 | `prototypes/_fonts/css/jost__500.css`（自托管） |
| 数字与编号 | Sometype Mono 400 / 600 | `prototypes/_fonts/css/sometype-mono__400-600.css`（自托管） |

三族全部 OFL 1.1。`font-family` 声明里不含任何禁用栈（Inter / Roboto / Arial / Helvetica /
system-ui / -apple-system / BlinkMacSystemFont / Segoe UI）。

## 四、已知的两处最弱的地方

1. **唯一的图是生成物，不是照片**。这对"少图"这个处境是正解，但如果店主其实有照片，
   这一案给不了"照片怎么摆"的答案。文案里已如实说明（页脚「本页无照片」）。
2. **`aspect-ratio: 16/9` + `object-fit: cover` 在极窄档（<420px）会把刻度纹理裁掉两端**，
   只剩中间一段。这不影响机制成立（刻度仍在），但"贯穿全幅"这一层会失效。
   若将来要修，做法是在窄档改 `object-fit: contain` 并换一张更高比例的图。
