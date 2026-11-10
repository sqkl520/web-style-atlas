# S21 联锁释放簿 · 挑片与烘焙（构建期脚本）
#
# 规格字段 6 第 5 条：所有照片先转灰度、再走 1-bit 阈值抖动（Bayer 4×4），
# 只保留主色 #3E3A34 与纸色 #E4DCC9 两阶。这里就是那一步——运行时不加任何滤镜。
# 规格字段 11：输出 AVIF 与 WebP 两版。
#
# 输入：assets/_cand/candidates.json（fetch-assets.ps1 落盘的候选与署名）
#       assets/_cand/<file>.jpg（原件缩略图）
# 输出：assets/pl-0N.webp|.avif（页面真正引用的位图，见下面 PICK）
#       assets/credits.json（页面真实引用 ∪ 候选落盘，交给 _build/write-credits.mjs 生成 CREDITS.md）
#
# **页面引用的是 .webp，不是 .avif**（2026-10-21 实测后的决定）：
#   · WebP 是无损两阶，纸色逐字节就是 #E4DCC9、主色逐字节就是 #3E3A34；
#     AVIF 即使 quality=100 + subsampling=4:4:4（Pillow 的 AVIF 写不了 lossless=True，会抛 TypeError）
#     也仍会把纸色round 到 #E3DCC8 —— 1440 档 1:1 渲染实测从 2 色变 244 色（其余为边缘抗锯齿）。
#   · 同一批六张，WebP 合计 57 KB，AVIF 合计 184 KB，是 WebP 的 3.2 倍。
#   · 规格字段 11 要求"输出 AVIF 与 WebP 两版"，所以两版都产出并留在 assets/；
#     但 1-bit 图版的正确交付面是无损的那一版。
#
# 挑片是编辑决定，写在下面的 PICK 表里，不交给排序函数：题材必须落在"调度系统自身"
# ——机械联锁机、扳道杆列、闭塞器、值班室、把关系压成二维表的刻印图。
# 明显该排除的（模型铁路、站舍外观、蒸汽机车、钢轨风景、告示牌）都在候选里，
# 见 _cand/candidates.json 与构建说明。
#
# **2026-10-21 复核（承接票：把 assets 里的图真正接到页面上）**：本表的 alt 与图版文案
# 逐张对着 _cand/ 的原图重写过一遍——初稿有若干处与图不符（把杆柄写成在左侧、把指示盘
# 写成刻度盘、把杆列写成"手柄"），按"谎称比缺图严重得多"的要求全部改成按实描述。
# 同时换掉一张：初稿 pl-03 用 leverframe-3.jpg，复核发现那张照片窗外有整节车体入画，
# 撞规格字段 9(2)「不得出现任何火车、钢轨、蒸汽或制服图案」，改用它后面的 stellwerk-2.jpg
# （同一题材：杆列 + 杆列上方的进路指示条，画面里没有车、没有轨、没有制服）。
# 6 张入选图逐张目视确认过：interlock-2 / hebelbank-2 / blockinstr-1 / relay-3 /
# plate-1 / stellwerk-2，全部不含火车、蒸汽与制服。
import json, os, sys
import numpy as np
from PIL import Image, ImageOps

ROOT = r'D:\Web\style\prototypes\S21-interlocking-release-book'
ASSETS = os.path.join(ROOT, 'assets')
CAND = os.path.join(ASSETS, '_cand')

INK = (62, 58, 52)      # #3E3A34
PAPER = (228, 220, 201)  # #E4DCC9
GAMMA = 0.68            # 中间调提亮系数，见 dither() 里的落墨量说明；逐条 PICK 可覆盖
BAYER4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16.0

# out / 源候选 / 显示宽度（按 1440 档的实际排版宽度给，1:1 不重采样，抖动点才不会被插值糊掉）/ 裁切比 / 图版文案
# 宽度来源：正文宽 = 1440 − 2×56 = 1328。pl-01 放在主张句右侧（1328 − 383 − 36 = 909）；
# pl-02..04 是三栏并排（(1328 − 2×18)/3 = 430.7）；pl-05..06 是两栏并排（(1328 − 18)/2 = 655）。
PICK = [
    dict(out='pl-01', src='interlock-2.jpg', w=909, aspect=2.66,
         alt='机械联锁机的锁闭床：玻璃罩下成排的钢制滑杆与带缺口的锁闭块交叠排列，右缘是一列杆柄，每根杆柄旁贴一条黄色刻印的杆号牌',
         no='1',
         head='机械联锁机的锁闭床',
         text='本簿转录的就是这一床关系：玻璃罩下每一根滑杆都有自己的一组缺口，哪两根杆不能同时扳动，由缺口的相对位置决定，不靠连线表示。右缘那一列黄色刻印杆号牌，是页内锁别号的写法来源。',
         src_line='Haraldmmueller，CC BY-SA 4.0，来自 Wikimedia Commons，原件 EM55 Hadersdorf am Kamp'),
    dict(out='pl-02', src='hebelbank-2.jpg', w=431, aspect=1.3333,
         alt='扳道杆列近观：一排钢杆，每根杆身上铆着一枚黑底白字的圆号牌（7、6、GsV、24、5、4、GsI），杆后是锁闭床的配重轮，右侧一面电气控制屏',
         no='2',
         head='杆列与杆号牌',
         text='杆号牌是铆在杆身上的圆牌，黑底白字——本页刻印数字牌的形制从这里来，深度也一样来自被刻掉的材料。杆后的配重轮与锁闭床，才是决定这七根杆能不能同时落位的东西。',
         src_line='Stefan Flöper, CC BY-SA 4.0，来自 Wikimedia Commons，原件 Stellwerk Reinheim'),
    dict(out='pl-03', src='blockinstr-1.jpg', w=431, aspect=1.3333,
         alt='闭塞器正面：灰蓝色铸铁外壳，上半一个白面指示盘，下方两块黄铜铭牌分别刻着 LINE CLOSED 与 TRAIN COMING FROM，中间一个带缺口挡板的黑色旋钮，左侧挂着一只电话听筒',
         no='3',
         head='令牌闭塞器',
         text='两个区间之间只允许有一列车，这件事在电气联锁之前靠这一台机器与一枚令牌保证。盘面上的 LINE CLOSED 与 TRAIN COMING FROM 是两个互斥状态，同一时刻只能给出一个——本页的互斥清单读的就是同一种关系。',
         src_line='PJeganathan，CC BY-SA 4.0，来自 Wikimedia Commons，原件班加罗尔站'),
    dict(out='pl-04', src='relay-3.jpg', w=431, aspect=1.3333,
         alt='值班室内景：木板墙与两扇窗，一排带白色槽位标牌的信号杆立在铁座上，窗台下的架子上放着行车登记簿与纸张，右侧一把转椅',
         no='4',
         head='值班室内景',
         text='台账、号牌与杆列在同一张桌上，登记与扳动在同一个人手里完成。这也是本簿的形态来源：行车日志竖排、一列一件事件，签字栏在右。',
         src_line='Lankyrider，CC BY-SA 4.0，来自 Wikimedia Commons，原件 Leadhills 值班室'),
    dict(out='pl-05', src='plate-1.jpg', w=656, aspect=1.775, gamma=1.0,
         alt='1908 年《铁路轨道与轨道工程》的刻印图版：三幅岔群与交叉的铺枕平面图，图上密排尺寸串（67 英尺 6 英寸、18 英尺 0 英寸等）与逐根枕木的英寸标注，图题写作 Arrangement of Switch Timbers at Turnout and Crossover, Erie Ry.',
         no='5',
         head='站场关系图（1908 年刻印）',
         text='把三维的岔群压成一张二维关系表，1908 年的工程图版就是这么做的：横向是里程，纵向是枕木位置，尺寸直接刻在图上。本页的联锁表沿用同一个做法，只是把「枕木位置」换成「锁别号」。',
         src_line='E. E. R. Tratman《Railway Track and Track Work》1908，无已知限制，来自 Wikimedia Commons'),
    dict(out='pl-06', src='stellwerk-2.jpg', w=656, aspect=1.5,
         alt='停用扳道台内景：锈蚀的钢制杆列与配重轮排成一列，杆列上方一条横向进路指示牌上刻着 02 至 07 的分区号，墙面绿漆成片剥落',
         no='6',
         head='进路指示条（停用的扳道台）',
         text='杆列上方那条指示条是关键：分区号并列成一行，锁闭到哪一格就刻到哪一格。本页的释放路径用的是同一种排列——横向、编号、首尾相接，读一列等于走一遍「扳这根之前必须先松哪根」的推理。',
         src_line='Trougnouf (Benoit Brummer)，CC BY 4.0，来自 Wikimedia Commons，原件 Sourbrodt 车站值班室'),
]


def load_candidates():
    with open(os.path.join(CAND, 'candidates.json'), encoding='utf-8-sig') as fh:
        raw = json.load(fh)
    flat = []
    stack = list(raw)
    while stack:
        it = stack.pop(0)
        if isinstance(it, list):
            stack[0:0] = it
        elif isinstance(it, dict) and 'value' in it and isinstance(it['value'], list):
            stack[0:0] = it['value']
        else:
            flat.append(it)
    return {c['file']: c for c in flat}


def crop_to(im, aspect):
    w, h = im.size
    if w / h > aspect:
        nw = round(h * aspect)
        x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = round(w / aspect)
    y = max(0, (h - nh) // 2)
    return im.crop((0, y, w, y + nh))


def dither(path_in, path_out, width, aspect, gamma=1.0):
    im = Image.open(path_in).convert('RGB')
    im = crop_to(im, aspect)
    h = max(1, round(width / aspect))
    im = im.resize((width, h), Image.LANCZOS)
    g = ImageOps.autocontrast(im.convert('L'), cutoff=1)
    a = np.asarray(g, dtype=np.float32) / 255.0
    # 0–1 两阶抖动的落墨量 ≈ 1 − 图像平均值。六张原片的平均值都在 0.36–0.47，
    # 直接抖出来是 53–64% 落墨：远看是一块灰，不像 1900 年代的刻印图版。
    # 这里按 gamma 把中间调提亮（gamma < 1 = 提亮），落到 35–45% 落墨，
    # 纸色能透出来，两阶的"点"才读得出是点。gamma 写进每条 PICK，逐张可复算。
    if gamma != 1.0:
        a = np.power(a, gamma)
    tile = np.tile(BAYER4, (h // 4 + 1, width // 4 + 1))[:h, :width]
    ink = (a <= tile + 0.5 / 16.0)[..., None]
    out = np.where(ink, np.array(INK, dtype=np.uint8), np.array(PAPER, dtype=np.uint8))
    res = Image.fromarray(out.astype(np.uint8), 'RGB')
    res.save(path_out + '.webp', 'WEBP', lossless=True, method=6)
    # AVIF：Pillow 不支持 lossless=True（会抛 TypeError），但 quality=100 + subsampling='4:4:4'
    # 实测能原样保住两阶（`getcolors` 仍是 2 色）。用默认的 quality=90 会把两阶糊成
    # 上千个颜色：实测 1440 档 1:1 渲染出来是 7,946 个不同颜色，纸色从 #E4DCC9 漂到 #E2DDCA。
    res.save(path_out + '.avif', 'AVIF', quality=100, subsampling='4:4:4')
    res.save(path_out + '.png', 'PNG', optimize=True)
    return res


def main():
    probe = '--probe' in sys.argv
    cmap = load_candidates()
    credits = []
    for p in PICK:
        c = cmap.get(p['src'])
        if not c:
            print('MISSING CANDIDATE', p['src']); continue
        res = dither(os.path.join(CAND, p['src']), os.path.join(ASSETS, p['out']), p['w'], p['aspect'], p.get('gamma', GAMMA))
        cols = res.getcolors(maxcolors=64)
        sizes = {ext: os.path.getsize(os.path.join(ASSETS, p['out'] + ext)) for ext in ('.webp', '.avif', '.png')}
        print(f"{p['out']}  {p['src']}  ->  {res.size[0]}x{res.size[1]}  "
              f"色数={len(cols)}  webp={sizes['.webp'] // 1024}K avif={sizes['.avif'] // 1024}K png={sizes['.png'] // 1024}K")
        assert len(cols) == 2, f"{p['out']} 不是两阶：{cols}"
        # 窄屏变体：390 档把 909px 的原版 downscale 到 278px（0.31 倍）会把 4×4 抖动平均成一片灰
        # ——实测该处出现占 18% 面积的中间调（146,140,128），两阶特征消失。
        # 所以按 390 档的真实排版宽度（正文宽 390 − 2×56 = 278）再烘一张 1:1 的窄屏版，
        # 用 <img srcset/sizes> 让窄屏取这一张；1440 / 768 仍取原版（那两档的缩放比 ≥0.72，网点保得住）。
        small = p['w'] / res.size[1]
        res_s = dither(os.path.join(CAND, p['src']), os.path.join(ASSETS, p['out'] + '-p'),
                       278, small, p.get('gamma', GAMMA))
        cs = res_s.getcolors(maxcolors=64)
        assert len(cs) == 2, f"{p['out']}-p 不是两阶：{cs}"
        print(f"    {p['out']}-p  278x{res_s.size[1]}  色数={len(cs)}  webp={os.path.getsize(os.path.join(ASSETS, p['out'] + '-p.webp')) // 1024}K")
        credits.append({
            'file': p['out'] + '.webp',
            'file_avif': p['out'] + '.avif',
            'file_mobile': p['out'] + '-p.webp',
            'plate': '图版 ' + p['no'],
            'aspect': round(p['w'] / res.size[1], 3),
            'title': c['title'],
            'artist': c['artist'],
            'license': c['license'],
            'origin': c['origin'],
            'source': c['source'],
            'page': c['page'],
            'query': c['query'],
            'candidate': p['src'],
            'processing': '灰度 + Bayer 4×4 阈值抖动，只留 #3E3A34 与 #E4DCC9 两阶',
        })
        if not probe:
            for ext in ('.png',):
                os.remove(os.path.join(ASSETS, p['out'] + ext))
                os.remove(os.path.join(ASSETS, p['out'] + '-p' + ext))
    with open(os.path.join(ASSETS, 'credits.json'), 'w', encoding='utf-8') as fh:
        json.dump(credits, fh, ensure_ascii=False, indent=1)
    print('credits.json:', len(credits), 'plates')


if __name__ == '__main__':
    main()
