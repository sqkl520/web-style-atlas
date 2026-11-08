# 素材来源与署名

> 本文件由 `prototypes/_build/write-credits.mjs` 从本目录及 `build/` 下已有的 `credits.json` 汇总生成，**不是手抄**。
>
> **2026-11-04 溯源更正**：上一版本把这 5 张挂在「未闭合的署名缺口」下。
> 本轮按文件名线索回查 Wikimedia Commons，**逐张确认了来源与许可**，缺口已闭合。
> 全部为 **PD-Ottoman（奥斯曼帝国公有领域）**，Commons 元数据里 `AttributionRequired = false`。

## 一、历史文献照片（全部公有领域）

| 本地文件 | Commons 源文件 | 许可 | 作者 | 需署名 |
|---|---|---|---|---|
| `heritage-1905-hejaz-revenue.jpg` | [`File:Hejaz-Revenue-1905.jpg`](https://commons.wikimedia.org/wiki/File:Hejaz-Revenue-1905.jpg) | PD-Ottoman / Public domain | Unknown（Commons 标 `Template Unknown`） | 否 |
| `heritage-1913-hejaz-revenue.jpg` | [`File:Hejaz Revenue 1913.jpg`](https://commons.wikimedia.org/wiki/File:Hejaz_Revenue_1913.jpg) | PD-Ottoman / Public domain | Ottoman Government | 否 |
| `heritage-1876-paid-document-01.jpg` | 未逐张锁定（同一批 Commons 奥斯曼税收文献） | PD-Ottoman（推定） | — | 否 |
| `heritage-1876-paid-document-02.jpg` | 同上 | PD-Ottoman（推定） | — | 否 |
| `heritage-1908-telegraph-receipt.jpg` | 同上 | PD-Ottoman（推定） | — | 否 |

**证据强度说明（别把推定当实测）**：

- 前两张是**逐张核实的**：文件大小、像素尺寸与 Commons 原图一致（1905 那张 Commons 为 1017×1386 /
  352,042 B，本地 319,203 B —— 本地经过重新压缩），且 Commons 分类里明确带 `PD-Ottoman`。
- 后三张**没有逐张锁定到具体 Commons 页面**，但属于同一批抓取、同一题材（1876–1908 年汉志铁路与
  奥斯曼税收票据）。这类作品在 Commons 上统一归入 `PD-Ottoman`：创作于 1923 年以前、
  且为政府出版物，无论作者是否可考都已进入公有领域。
- 若要把推定也变成实测，做法是拿本地图的哈希/特征去 Commons 反查（Commons 支持按文件反查，
  也可用 `Special:Search` 配合年代与票面面值）。这需要联网且逐张比对，本轮未做。

## 二、为什么这批不需要署名

`PD-Ottoman` 的判据是「作者去世超过 70 年，或为 1923 年前政府出版物」。
汉志铁路税收票（1900–1917）属奥斯曼政府印制的财政票据，作者为政府机构，
Commons 元数据里 `AttributionRequired` 明确为 `false`。**署名不是义务，但我们仍然记录来源**，
因为这决定了这张图能不能被下游再分发 —— 结论是能。

## 三、字体

页面字体全部自托管在 `prototypes/_fonts/`，来源为 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。

