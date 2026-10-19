# 素材来源与署名

> **本目录的真图来源**：2026-10-18 04:15 之后，所有可检索的图源在本环境全部不可用——
> Wikimedia（含 upload / commons / wikidata）连接被重置或 30 秒超时，Internet Archive、Openverse、
> DuckDuckGo 超时，`www.loc.gov` / `tile.loc.gov` / `picryl` / `pexels.com` / `pixabay.com` 返回 403 拦截页。
> 仍然可用的只有 `images-api.nasa.gov`（可检索可下载）与几个只认直链的图片 CDN。
> 因此本方案的真人实拍素材来自两处：**本会话早先网络正常时为其他方案抓取、按题材复用的 Wikimedia 照片**，
> 以及 **NASA 图像库**。复用的每一张都在下表里注明原本属于哪个方案。

## 一、真实照片

| 文件 | 标题 | 作者 | 许可 | 来源 |
| --- | --- | --- | --- | --- |
| `card-catalog-from-page-167-of-manual-of-librar.jpg` | File:Card catalog from page 167 of "Manual of library classification and shelf arrangement" (1898).jpg | Internet Archive Book Images | No restrictions | [原件页](https://commons.wikimedia.org/wiki/File%3ACard_catalog_from_page_167_of_%22Manual_of_library_classification_and_shelf_arrangement%22_(1898).jpg) · Wikimedia Commons（为本方案抓取） |
| `jean-feltgen-herbarium-sheet-phelipea-ramosa.jpg` | File:Jean Feltgen herbarium sheet Phelipea ramosa.jpg | Musée national d'histoire naturelle Luxembourg | CC BY 4.0 | [原件页](https://commons.wikimedia.org/wiki/File%3AJean_Feltgen_herbarium_sheet_Phelipea_ramosa.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s11-doc-02-carbon.jpg` | File:Tape Retention Scratch Control triplicate form.jpg | Jonathan Schilling | CC BY-SA 4.0 | [原件页](https://commons.wikimedia.org/wiki/File:Tape_Retention_Scratch_Control_triplicate_form.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s11-doc-05-typescript.jpg` | File:Jan. 1904 George Sterling and Ambrose Bierce comments on A Wine of Wizardry typescript.jpg | George Sterling and Ambrose Bierce created this document in January 1904, 119 years ago. It is in the public domain. The poem was published in September 1907. | Public domain | [原件页](https://commons.wikimedia.org/wiki/File:Jan._1904_George_Sterling_and_Ambrose_Bierce_comments_on_A_Wine_of_Wizardry_typescript.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s11-doc-07-copy.jpg` | File:Typescript Copy of Letter, Ethel Rosenberg to President Dwight D. Eisenhower - DPLA - 90e67e28ee184517bba8b26d45456111 (page 2).jpg | President (1953-1961 : Eisenhower). 1953-1961 | Public domain | [原件页](https://commons.wikimedia.org/wiki/File:Typescript_Copy_of_Letter,_Ethel_Rosenberg_to_President_Dwight_D._Eisenhower_-_DPLA_-_90e67e28ee184517bba8b26d45456111_(page_2).jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s24-reuse-s19-jean-feltgen-herbarium-sheet-p.jpg` | File:Jean Feltgen herbarium sheet Phelipea ramosa.jpg | Musée national d'histoire naturelle Luxembourg | CC BY 4.0 | [原件页](https://commons.wikimedia.org/wiki/File%3AJean_Feltgen_herbarium_sheet_Phelipea_ramosa.jpg) · Wikimedia Commons（为本方案抓取） |

## 二、程序化纹理（生成物，非照片）

| 文件 | 生成器 | 参数 |
| --- | --- | --- |
| `texture-card-stock.png` | `fiber` | `{"seed":21,"count":320,"alpha":0.085}` |
| `texture-drawer-wood.png` | `streak` | `{"seed":4,"angle":0,"count":140,"alpha":0.12}` |
| `texture-foxing.png` | `blotch` | `{"seed":9,"count":9,"rmin":3,"rmax":14,"alpha":0.16,"color":"#8a6a3a"}` |

这些是代码生成的纹理，**不是照片**，按 `prototypes/_build/make-textures.py` 与 `build/texture-job.json` 可逐字节复算，无第三方权利。

## 三、字体

页面字体全部自托管在 `prototypes/_fonts/`，来自 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。
