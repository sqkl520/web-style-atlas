# 素材来源与署名

> **本目录的真图来源**（本块 2026-10-24 改写；逐主机连通性真值单一来源见 `prototypes/_CONTRACT.md` §10.1，本文不重复网络状态断言）：
> 本方案的实拍素材来自两处：**本会话早先网络正常时为其他方案抓取、按题材复用的 Wikimedia 照片**，以及 **NASA 图像库**。复用的每一张都在下表里注明原本属于哪个方案。
> 2026-10-18 04:15 之后本环境曾进入图源受限窗口（Wikimedia 连接被重置、loc.gov／picryl／pexels／pixabay 返回 403），**2026-10-22 复测已解除**（commons HTTP 200、检索命中、缩略图可下载）。
> 因此下表若有题材与本案主张不对的图，那是历史窗口的遗留、不是“现在拿不到”——补对题素材是产品决定，逐案缺口须写在下表备注里（契约 §10.1 硬要求）。

## 一、真实照片

| 文件 | 标题 | 作者 | 许可 | 来源 |
| --- | --- | --- | --- | --- |
| `ichos-hifi-ta440-eight-channel-vacuum-tube-amp.jpg` | File:ICHOS-HIFI TA440 Eight Channel Vacuum Tube Amplifier 440 Watts.jpg | Ichos-hifi | CC BY-SA 4.0 | [原件页](https://commons.wikimedia.org/wiki/File%3AICHOS-HIFI_TA440_Eight_Channel_Vacuum_Tube_Amplifier_440_Watts.jpg) · Wikimedia Commons（为本方案抓取） |
| `nasa-kennedy-space-center-fla-during-powe-gbbjm.jpg` | KENNEDY SPACE CENTER, FLA.  -   During power-up of the orbiter Discovery in the Orbiter Processing Facility, a technician turns on a switch.  Discovery has been undergoing Orbiter Major Modifications in the past year, ranging from wiring, control panels and black boxes to gaseous and fluid systems tubing and components.  These systems were deserviced, disassembled, inspected, modified, reassembled, checked out and reserviced, as were most other systems onboard.  The work includes the installation of the Multifunction Electronic Display Subsystem (MEDS) - a state-of-the-art “glass cockpit.” | NASA | 公有领域（NASA 图像使用条款） | [原件页](https://images-assets.nasa.gov/image/KSC-03pd2449/KSC-03pd2449~medium.jpg) · Wikimedia Commons（为本方案抓取） |
| `nasa-kennedy-space-center-fla-during-powe-q0jbd.jpg` | KENNEDY SPACE CENTER, FLA.  -  During power-up of the orbiter Discovery in the Orbiter Processing Facility, a technician moves a switch.  Discovery has been undergoing Orbiter Major Modifications in the past year, ranging from wiring, control panels and black boxes to gaseous and fluid systems tubing and components.  These systems were deserviced, disassembled, inspected, modified, reassembled, checked out and reserviced, as were most other systems onboard.  The work includes the installation of the Multifunction Electronic Display Subsystem (MEDS) - a state-of-the-art “glass cockpit.” | NASA | 公有领域（NASA 图像使用条款） | [原件页](https://images-assets.nasa.gov/image/KSC-03pd2448/KSC-03pd2448~medium.jpg) · Wikimedia Commons（为本方案抓取） |
| `nasa-ksc-2011-8368-7nzif.jpg` | KSC-2011-8368 | NASA | 公有领域（NASA 图像使用条款） | [原件页](https://images-assets.nasa.gov/image/KSC-2011-8368/KSC-2011-8368~medium.jpg) · Wikimedia Commons（为本方案抓取） |
| `ntm-cathode-ray-tubers-kr-birkeland-1890s-img-.jpg` | File:NTM cathode ray tubers Kr Birkeland 1890s IMG 0892.JPG | Bjoertvedt | CC BY-SA 4.0 | [原件页](https://commons.wikimedia.org/wiki/File%3ANTM_cathode_ray_tubers_Kr_Birkeland_1890s_IMG_0892.JPG) · Wikimedia Commons（为本方案抓取） |
| `tube-amplifier-vacuum-tube-kingdom-tokyo-radio.jpg` | File:Tube amplifier @ Vacuum Tube Kingdom, Tokyo Radio Department Store B1F (2010-03-06 16.34.02).jpg | street viewer | CC BY 2.0 | [原件页](https://commons.wikimedia.org/wiki/File%3ATube_amplifier_%40_Vacuum_Tube_Kingdom%2C_Tokyo_Radio_Department_Store_B1F_(2010-03-06_16.34.02).jpg) · Wikimedia Commons（为本方案抓取） |

## 二、程序化纹理（生成物，非照片）

| 文件 | 生成器 | 参数 |
| --- | --- | --- |
| `texture-scanline.png` | `scanlines` | `{"period":3,"alpha":0.16}` |
| `texture-phosphor-grain.png` | `grain` | `{"seed":7,"density":0.42,"alpha":0.07}` |
| `texture-schematic-grid.png` | `grid` | `{"step":8,"alpha":0.12}` |

这些是代码生成的纹理，**不是照片**，按 `prototypes/_build/make-textures.py` 与 `build/texture-job.json` 可逐字节复算，无第三方权利。

## 三、字体

页面字体全部自托管在 `prototypes/_fonts/`，来自 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。
