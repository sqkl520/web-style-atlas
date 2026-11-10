# 规格字段 3 的面积预算（本案主色 24%）是按"平涂色块面积"写的，
# 但字段 3-附又要求"色彩只能由位图与实色构成"。两条在照片面积上直接对撞。
# 这个脚本用全页 PNG 实测两个数：平涂面积 vs 位图面积，并给出每个色值的实际占比。
#
# 分类不靠颜色而靠**局部方差**：平涂区块方差≈0，照片区块方差高。
# 这一点很关键——减光叠层用 #101A1C 压暗，暗部照片像素会被拉向底色，
# 若按颜色阈值分类，照片会被误记成"底色平涂"。
import sys
import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else r"D:\Web\style\deliverables\tool-runs\S03-area-full.png"

PALETTE = {
    "极夜底 #101A1C": (0x10, 0x1A, 0x1C),
    "区块底 #0C1417": (0x0C, 0x14, 0x17),
    "面板 #162226": (0x16, 0x22, 0x26),
    "冷青主色 #13928E": (0x13, 0x92, 0x8E),
    "记录纸白 #C9D6CF": (0xC9, 0xD6, 0xCF),
    "纸带米 #B9A98C": (0xB9, 0xA9, 0x8C),
    "表格线 #2A3639": (0x2A, 0x36, 0x39),
    "次刻度 #4A5A5E": (0x4A, 0x5A, 0x5E),
    "停用字 #7C8A8C": (0x7C, 0x8A, 0x8C),
    "表头线 #3B4A4D": (0x3B, 0x4A, 0x4D),
}

img = Image.open(SRC).convert("RGB")
a = np.asarray(img, dtype=np.float32)
H, W, _ = a.shape
print(f"图像 {W}x{H} = {H*W/1e6:.2f} Mpx   （全页 PNG）")

# 补齐到 4 的倍数，按 4x4 区块算局部标准差
ph, pw = (-H) % 4, (-W) % 4
if ph or pw:
    a = np.pad(a, ((0, ph), (0, pw), (0, 0)), mode="edge")
bh, bw = a.shape[0] // 4, a.shape[1] // 4
blocks = a.reshape(bh, 4, bw, 4, 3).transpose(0, 2, 3, 1, 4).reshape(bh, bw, 16, 3)
std = blocks.std(axis=2).max(axis=2)          # 每个区块在任一通道上的最大标准差
mean = blocks.mean(axis=2)                    # 区块均色

FLAT = 3.0                                     # 标准差阈值：低于此判为平涂
flat_mask = std < FLAT
n_blocks = bh * bw
flat_px = int(flat_mask.sum()) * 16
photo_px = n_blocks * 16 - flat_px
print(f"\n平涂面积 {flat_px/(H*W)*100:6.2f}%   位图（照片）面积 {photo_px/(H*W)*100:6.2f}%"
      f"   [4x4 区块，std<{FLAT}]")

# 平涂区块按最近调色板色归类
flat_mean = mean[flat_mask]
d = np.linalg.norm(flat_mean[:, None, :] - np.array(list(PALETTE.values()), dtype=np.float32)[None, :, :], axis=2)
idx = d.argmin(axis=1)
near = d.min(axis=1) < 14                       # 与调色板足够接近才计入该色值
names = list(PALETTE.keys())
print(f"\n{'色值':<22}{'占全页':>9}{'占平涂':>10}")
tot = H * W
rows = []
for i, name in enumerate(names):
    sel = (idx == i) & near
    px = int(sel.sum()) * 16
    rows.append((name, px))
for name, px in sorted(rows, key=lambda r: -r[1]):
    print(f"{name:<22}{px/tot*100:8.3f}%{px/flat_px*100 if flat_px else 0:9.2f}%")
other = int((~near).sum()) * 16
print(f"{'（平涂但非调色板色）':<22}{other/tot*100:8.3f}%{other/flat_px*100 if flat_px else 0:9.2f}%")

# 规格字段 3 给本案的面积预算
print("\n--- 规格预算 vs 实测 ---")
budget = {"极夜底 #101A1C": 60, "冷青主色 #13928E": 24, "记录纸白 #C9D6CF": 12, "纸带米 #B9A98C": 4}
by = {n: px for n, px in rows}
for name, want in budget.items():
    got = by.get(name, 0) / tot * 100
    flag = "达标" if abs(got - want) <= 6 else ("偏低" if got < want else "偏高")
    print(f"  {name:<22} 预算 {want:>2}%   实测 {got:6.3f}%   {flag}")
teal = by.get("冷青主色 #13928E", 0) / tot * 100
print(f"\n结论：照片/位图吃掉 {photo_px/tot*100:.1f}% 的画面，平涂只剩 {flat_px/tot*100:.1f}%；")
print(f"      冷青主色实测 {teal:.3f}%，规格预算 24% —— 缺口 {(24-teal):.1f} 个百分点全部让给了照片。")
print("      这正是字段 3 的面积预算与字段 3-附『色彩只能来自位图』的对撞点。")
