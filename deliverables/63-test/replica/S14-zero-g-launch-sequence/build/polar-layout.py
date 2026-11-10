# S14 零重力发射序 —— 极坐标站位表生成器
#
# 规格字段 5：每枚标贴的位置由「到质心的距离 r」与「方位角 θ」定义，r 按内容质量分
# 24 / 40 / 72 / 120px 四档，θ 间隔非均匀（最小 26°、最大 61°）；质心偏离视口几何中心且持续漂移。
# 字段 8：标贴共 11 枚、尺寸按 24/40/72/120px 分四档，不存在等量重复。
#
# 站位 = 质心 + (RX·s·cosθ, RY·s·sinθ)，s 是质量档决定的比例（r 档越大越靠外）。
# 角度表非均匀是有几何理由的：椭圆在左右两端切向是竖直的（只有 170px 标贴高度要躲），
# 在上下两端切向是水平的（要躲 300px 以上的标贴宽度），所以大间隔给上下、小间隔给左右。
# 收敛只允许沿自身径向移动（ρ 变、θ 不变），θ 间隔表在收敛后仍然成立。
import json, math
from pathlib import Path

VIEW_W = 1440.0
FIELD_H = 1700.0
DRIFT = 48.0            # ≥1440px 漂移半径
EDGE = 56.0             # 漂移 48px + 8px 安全边
CPX, CPY = 0.500, 0.500  # 质心：几何中心 50%，另加 3% 的常驻偏置（见 OFFSET）
OFFSET = -0.03          # 质心相对视口几何中心的常驻偏置（-3%，偏左）
RX, RY = 450.0, 700.0   # 极坐标参考椭圆的横／纵向半径
SCALE = {24: 0.860, 40: 0.900, 72: 0.950, 120: 1.000}

# (键, 航电编号, 标题, 正文, r 档, θ°, 宽度, 航电符号)
STICKERS = [
    ("prop",  "A-1107", "推进剂加注",     "偏二甲肼与四氧化二氮两条管线同时接入，加注速率不超过每分钟 240 升，贮箱液位到位后自动切换补压。", 120,  84.0, 330, "valve"),
    ("tank",  "A-1108", "贮箱增压",       "用氦气把贮箱压力提到 0.32 MPa，保持 90 秒不掉压，才允许进入下一步。",             40,  56.0, 254, "pressure"),
    ("gyro",  "A-1109", "陀螺平台通电",   "平台加温到 42℃ 后通电，漂移率连续三分钟低于 0.02 度每小时。",                      72, 132.0, 310, "gyro"),
    ("link",  "A-1110", "遥测下行链路",   "S 波段与 C 波段各锁一次，误码率低于十的负六次方，帧同步保持 120 秒。",              120, 300.0, 330, "circuit"),
    ("latch", "A-1111", "载荷舱机械锁",   "四只锁钩逐一脱开，脱开后行程开关点亮，任一只未到位就退回锁定位。",                  40, 188.0, 268, "valve"),
    ("thr",   "A-1112", "姿控推力器预热", "八台推力器各点三次，脉宽 40 毫秒，看推力室温度回升曲线是否重合。",                  72, 218.0, 300, "pressure"),
    ("cabin", "A-1113", "舱压在轨初检",   "舱压从 101 kPa 降到 70 kPa，检漏 8 分钟，压降不超过 0.4 kPa。",                     24, 334.0, 226, "pressure"),
    ("bat",   "A-1114", "电池组均衡充电", "两组电池轮流恒流充到 28.5 V，单体压差压到 15 mV 以内。",                            24, 162.0, 212, "circuit"),
    ("mass",  "A-1115", "质心配平配重",   "配重块按 8 档滑轨移动，把质心横向偏心压到 6 毫米以内，读数走远端质心寄存器。",      40,  26.0, 240, "gyro"),
    ("sep",   "A-1116", "脐带分离时序",   "分离信号提前 1.2 秒给出，气路先断、电路后断；顺序反了就是一次中止。",                72, 254.0, 288, "circuit"),
    ("chill", "A-1117", "主发动机预冷",   "液氧流过冷却夹套 240 秒，出口温度低于 90 K 才允许点火。",                            24,   0.0, 212, "valve"),
]

CX = VIEW_W * (CPX + OFFSET)
CY = FIELD_H * CPY


def estimate_h(w, body):
    """标贴高度估算，与 style.css 里的结构逐项对齐：
    12px 上下内边距×2 = 24；编号行（15px 等宽 + 13px 档位读数 + 24px 航电符号）24；
    6px 间隔；标题行 25；6px 间隔；正文 n 行（16px/1.8 = 28.8px/行）；
    最后加 20px 余量，换行数万一多一行也不会压到邻居。"""
    per_line = max(8.0, (w - 28) / 16.0)
    lines = max(3, math.ceil(len(body) / per_line))
    return 24 + 24 + 6 + 25 + 6 + lines * 28.8 + 20


def station(theta_deg, s):
    t = math.radians(theta_deg)
    return CX + RX * s * math.cos(t), CY + RY * s * math.sin(t)


def safe_box(w, h):
    return (w / 2 + EDGE, VIEW_W - w / 2 - EDGE, h / 2 + EDGE, FIELD_H - h / 2 - EDGE)


def build():
    items = []
    for key, code, title, body, tier, th, w, glyph in STICKERS:
        h = estimate_h(w, body)
        s = SCALE[tier]
        x, y = station(th, s)
        bx0, bx1, by0, by1 = safe_box(w, h)
        x, y = min(max(x, bx0), bx1), min(max(y, by0), by1)
        items.append(dict(key=key, code=code, title=title, body=body, tier=tier, theta=th,
                          s=s, w=w, h=h, x=x, y=y, glyph=glyph))
    return items


def collide(a, b):
    dx, dy = abs(a["x"] - b["x"]), abs(a["y"] - b["y"])
    return dx < (a["w"] + b["w"]) / 2 + 26 and dy < (a["h"] + b["h"]) / 2 + 22


def try_s(s_, sc):
    x, y = station(s_["theta"], sc)
    bx0, bx1, by0, by1 = safe_box(s_["w"], s_["h"])
    if bx0 <= x <= bx1 and by0 <= y <= by1:
        return round(sc, 4), x, y
    return None


def relax(items):
    """逐对分离：每一次只让其中一方沿自身径向线移到「刚好不叠」的最近位置（ρ 变、θ 不变）。
    每一轮把当前所有叠压对都过一遍（Gauss-Seidel），暂时分不开的留到下一轮重试。"""
    lo, hi = 0.78, 1.075
    for _ in range(400):
        pairs = []
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                a, b = items[i], items[j]
                if collide(a, b):
                    pen = min((a["w"] + b["w"]) / 2 + 26 - abs(a["x"] - b["x"]),
                              (a["h"] + b["h"]) / 2 + 22 - abs(a["y"] - b["y"]))
                    pairs.append((pen, a, b))
        if not pairs:
            break
        pairs.sort(key=lambda p: -p[0])
        for _, a, b in pairs:
            if not collide(a, b):
                continue
            light = b if a["tier"] >= b["tier"] else a
            heavy = a if light is b else b
            best = None
            for mover in (light, heavy):
                other = heavy if mover is light else light
                for step in range(4, 470, 4):
                    for sign in (-1, 1):
                        sc = mover["s"] + sign * step / max(RX, RY)
                        if sc < lo or sc > hi:
                            continue
                        got = try_s(mover, sc)
                        if not got:
                            continue
                        _, x2, y2 = got
                        dx, dy = abs(x2 - other["x"]), abs(y2 - other["y"])
                        if dx >= (mover["w"] + other["w"]) / 2 + 26 or dy >= (mover["h"] + other["h"]) / 2 + 22:
                            if best is None or step < best[0]:
                                best = (step, mover, got)
                    if best:
                        break
                if best:
                    break
            if best:
                mover, (_, x2, y2) = best[1], best[2]
                mover["s"], mover["x"], mover["y"] = best[2]
    bad = [(items[i]["code"], items[j]["code"]) for i in range(len(items)) for j in range(i + 1, len(items)) if collide(items[i], items[j])]
    if bad:
        print("still colliding: " + str(bad))
    return len(bad)


def main():
    items = build()
    left = relax(items)
    ths = sorted(s["theta"] for s in items)
    gaps = [round((ths[(i + 1) % len(ths)] - ths[i]) % 360, 1) for i in range(len(ths))]
    print(f"centroid ({CX:.0f}, {CY:.0f})  field {VIEW_W:.0f}x{FIELD_H:.0f}  RX {RX:.0f} RY {RY:.0f}  drift {DRIFT:.0f}")
    print(f"theta gaps: min {min(gaps)}  max {max(gaps)}")
    print(f"residual collisions: {left}")
    print("")
    for s in sorted(items, key=lambda s: s["code"]):
        rr = math.hypot(s["x"] - CX, (s["y"] - CY) / (RY / RX))
        print(f"{s['code']}  r{s['tier']:<4} th{s['theta']:>6.0f}  s{s['s']:.3f}  rho{rr:>6.1f}  "
              f"x {s['x']:>7.1f}  y {s['y']:>7.1f}  w {s['w']}  h~{s['h']}  "
              f"L{s['x'] - s['w'] / 2:>7.1f} R{s['x'] + s['w'] / 2:>7.1f} "
              f"T{s['y'] - s['h'] / 2:>7.1f} B{s['y'] + s['h'] / 2:>7.1f}")
    out = {s["code"]: {k: (round(v, 1) if isinstance(v, float) else v) for k, v in s.items()} for s in items}
    dest = Path(__file__).resolve().parent / "polar-layout.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("\nwrote " + str(dest))


if __name__ == "__main__":
    main()
