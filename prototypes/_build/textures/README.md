# 纹理生成器参数快照（12/30 案）

这不是生成器的**权威写入目标**，是**取证快照**。

- 内容：这 12 案 `build/texture-job.json` 的副本（`outDir` + `jobs[]`），已与源文件逐 job 比对一致（2026-10-24，12/12）。
- 为什么要一份副本：`prototypes/*/build/` 被 `.gitignore` 排除，克隆者看不到 `texture-job.json`，
  于是 README / LICENSE 里"程序化纹理参数落盘、可逐字节复算、无第三方权利"这句**对克隆者不可核**
  （见 `deliverables/39-critique-toolchain-repro.md` §M2）。本目录把 12 案的参数搬到受跟踪路径，让这句今天可验。
- **⚠️ 漂移风险（如实说）**：生成器 `assign-assets.mjs` / `fetch-scheme-assets.mjs` 的 `jobFile` **仍写 `build/`**，
  `make-textures.py` 还没有 `--jobs-dir` 模式。所以本快照是**冻结的**——任何人重跑纹理生成，改的是 `build/`，
  不会更新这里，两者会分叉。**彻底修好需要同步改 4 处**（复制→改写 jobFile→加 --jobs-dir→重烘校验），
  那是一次专门的 atomic 改动，未完成；在它完成前，本目录只作"截至 2026-10-24 参数为何"的证据，不作生成入口。
- 覆盖：S18 S19 S20 S21 S22 S23 S24 S26 S27 S28 S29 S30 共 12 案（盘上有 texture-job.json 的就是这 12 案）。
  其余 18 案盘上本就无 texture-job.json（不是快照漏搬），不在本目录。

## 复算实测（2026-10-24，修复波 A 批）

把 `S18.json` 的 `outDir` 临时改到 scratch 后用 `python prototypes/_build/make-textures.py <该文件>` 重烘
（cwd = 仓库根；`outDir` 是仓库根相对路径，`make-textures.py:12` 明说相对路径按 cwd 解析）：
产出的 `texture-scanline.png` / `texture-phosphor-grain.png` / `texture-schematic-grid.png`
与 `prototypes/S18-phosphor-service-deck/assets/` 里**已交付的三份 SHA-256 逐字节相同**。
⇒ 本目录的副本不是摆设："可逐字节复算"从克隆者视角今天起可验。

## 覆盖率（如实说）：12 份只占纹理字节的 19.6%

按 `assets/texture-*.png` 实测：本目录 12 案合计 **478,202 B**，全库 `texture-*.png` 合计
**2,435,948 B**。缺口几乎全在 **S15 一家：9 份 1,920,779 B = 78.9%**——它的参数单是
`prototypes/S15-*/build/textures.json`，**结构不同**（`{prototype, generator, palette, caps…}`，
没有 `jobs[]`），生成器是它自己的 `build/make-plates.py`，**不经过 `make-textures.py`**。
另有 S10 的 36,967 B（1.5%）属同类。**把 S15 的参数单与生成器一并搬进受跟踪路径才能覆盖到 ~98.5%**
（40 号 §3-2 的算法），那一步超出本轮机械修复范围，未做。