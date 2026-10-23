# 素材来源与署名

> **本目录的真图来源**（本块 2026-10-24 改写；逐主机连通性真值单一来源见 `prototypes/_CONTRACT.md` §10.1，本文不重复网络状态断言）：
> 本方案的实拍素材来自两处：**本会话早先网络正常时为其他方案抓取、按题材复用的 Wikimedia 照片**，以及 **NASA 图像库**。复用的每一张都在下表里注明原本属于哪个方案。
> 2026-10-18 04:15 之后本环境曾进入图源受限窗口（Wikimedia 连接被重置、loc.gov／picryl／pexels／pixabay 返回 403），**2026-10-22 复测已解除**（commons HTTP 200、检索命中、缩略图可下载）。
> 因此下表若有题材与本案主张不对的图，那是历史窗口的遗留、不是“现在拿不到”——补对题素材是产品决定，逐案缺口须写在下表备注里（契约 §10.1 硬要求）。

## 一、真实照片

| 文件 | 标题 | 作者 | 许可 | 来源 |
| --- | --- | --- | --- | --- |
| `reuse-s01-plate-05-hearing.jpg` | File:S.R.O. sign out as Monopoly Committee opens hearings. Washington, D.C., Dec. 1. Standing room only was the order today as the Temporary Economic Committee, Joint Legislative-Executive Body LCCN2016874466.jpg | Harris &amp; Ewing, photographer | Public domain | [原件页](https://commons.wikimedia.org/wiki/S.R.O._sign_out_as_Monopoly_Committee_opens_hearings._Washington,_D.C.,_Dec._1._Standing_room_only_was_the_order_today_as_the_Temporary_Economic_Committee,_Joint_Legislative-Executive_Body_LCCN2016874466.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s11-doc-02-carbon.jpg` | File:Tape Retention Scratch Control triplicate form.jpg | Jonathan Schilling | CC BY-SA 4.0 | [原件页](https://commons.wikimedia.org/wiki/File:Tape_Retention_Scratch_Control_triplicate_form.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s11-doc-05-typescript.jpg` | File:Jan. 1904 George Sterling and Ambrose Bierce comments on A Wine of Wizardry typescript.jpg | George Sterling and Ambrose Bierce created this document in January 1904, 119 years ago. It is in the public domain. The poem was published in September 1907. | Public domain | [原件页](https://commons.wikimedia.org/wiki/File:Jan._1904_George_Sterling_and_Ambrose_Bierce_comments_on_A_Wine_of_Wizardry_typescript.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s11-doc-07-copy.jpg` | File:Typescript Copy of Letter, Ethel Rosenberg to President Dwight D. Eisenhower - DPLA - 90e67e28ee184517bba8b26d45456111 (page 2).jpg | President (1953-1961 : Eisenhower). 1953-1961 | Public domain | [原件页](https://commons.wikimedia.org/wiki/File:Typescript_Copy_of_Letter,_Ethel_Rosenberg_to_President_Dwight_D._Eisenhower_-_DPLA_-_90e67e28ee184517bba8b26d45456111_(page_2).jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s16-plate-01-figaro-manifesto.jpg` | File:Manifesto futurismo Le Figaro.jpg | Le Figaro | Public domain | [原件页](https://commons.wikimedia.org/wiki/File%3AManifesto%20futurismo%20Le%20Figaro.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s16-plate-02-parole-liberta.jpg` | File:Filippo Tommaso Marinetti - Parole in Liberta 1932 C.jpg | Filippo Tommaso Marinetti | Public domain | [原件页](https://commons.wikimedia.org/wiki/File%3AFilippo%20Tommaso%20Marinetti%20-%20Parole%20in%20Liberta%201932%20C.jpg) · Wikimedia Commons（为本方案抓取） |

## 二、程序化纹理（生成物，非照片）

| 文件 | 生成器 | 参数 |
| --- | --- | --- |
| `texture-cloth-fold.png` | `streak` | `{"seed":23,"angle":1.35,"count":90,"alpha":0.13}` |
| `texture-stone-grain.png` | `grain` | `{"seed":81,"density":0.5,"alpha":0.07}` |
| `texture-paint-blotch.png` | `blotch` | `{"seed":83,"count":8,"rmin":10,"rmax":44,"alpha":0.14,"color":"#0e6258"}` |

这些是代码生成的纹理，**不是照片**，按 `prototypes/_build/make-textures.py` 与 `build/texture-job.json` 可逐字节复算，无第三方权利。

## 三、字体

页面字体全部自托管在 `prototypes/_fonts/`，来自 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。
