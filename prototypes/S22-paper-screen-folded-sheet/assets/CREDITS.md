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
| `reuse-s01-plate-05-hearing.jpg` | File:S.R.O. sign out as Monopoly Committee opens hearings. Washington, D.C., Dec. 1. Standing room only was the order today as the Temporary Economic Committee, Joint Legislative-Executive Body LCCN2016874466.jpg | Harris &amp; Ewing, photographer | Public domain | [原件页](https://commons.wikimedia.org/wiki/S.R.O._sign_out_as_Monopoly_Committee_opens_hearings._Washington,_D.C.,_Dec._1._Standing_room_only_was_the_order_today_as_the_Temporary_Economic_Committee,_Joint_Legislative-Executive_Body_LCCN2016874466.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s01-plate-07-newspaper-pile.jpg` | File:Interior view of newspaper delivery room showing man taking stack of newspapers from machine) - World-Telegram photo LCCN95506971.jpg | Miscellaneous Items in High Demand, PPOC, Library of Congress | Public domain | [原件页](https://commons.wikimedia.org/wiki/Interior_view_of_newspaper_delivery_room_showing_man_taking_stack_of_newspapers_from_machine)_-_World-Telegram_photo_LCCN95506971.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s13-src-shelving.jpg` | src-shelving | （原件未标注作者） | 见来源页 | — · Wikimedia Commons（为本方案抓取） |
| `reuse-s13-src-washi.jpg` | src-washi | （原件未标注作者） | 见来源页 | — · Wikimedia Commons（为本方案抓取） |
| `reuse-s25-plate2.jpg` | File:Printing and bookbinding for schools (1914) (14802851343).jpg | Vaughn, Samuel Jesse, b. 1877 | No restrictions | — · Wikimedia Commons（为本方案抓取） |
| `reuse-s25-plate4.jpg` | File:Nominet-2021-egm-members-list-on-paper-575-pages.jpg | Simon Blackler (Krystal Hosting t/a PublicBenefit.uk) | CC BY 4.0 | — · Wikimedia Commons（为本方案抓取） |

## 二、程序化纹理（生成物，非照片）

| 文件 | 生成器 | 参数 |
| --- | --- | --- |
| `texture-washi-fiber.png` | `fiber` | `{"seed":27,"count":1400,"alpha":0.1}` |
| `texture-crease.png` | `crease` | `{"horizontal":true,"pos":0.5,"alpha":0.42,"dark":"#6b6558","light":"#ffffff"}` |
| `texture-soft-ground.png` | `grain` | `{"seed":41,"density":0.5,"alpha":0.045}` |

这些是代码生成的纹理，**不是照片**，按 `prototypes/_build/make-textures.py` 与 `build/texture-job.json` 可逐字节复算，无第三方权利。

## 三、字体

页面字体全部自托管在 `prototypes/_fonts/`，来自 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。
