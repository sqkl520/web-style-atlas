// gen2.mjs — 从 data-m32-definitive.json（定稿快照）+ 既有数据生成最终表
import { readFileSync, writeFileSync } from 'node:fs';
const rd = (f) => JSON.parse(readFileSync(new URL('./' + f, import.meta.url), 'utf8'));
const d = rd('data-m32-definitive.json');
const m2 = rd('data-m2-detail.json');
const m5 = rd('data-m5b-detailvar-390.json').vps['390'];
const m5b = rd('data-m5b-detailvar-414.json').vps['414'];
const m9 = rd('data-m9-typography.json');
const m8 = rd('data-m8-fields-decomp.json');
const m15 = rd('data-m15-finalvar.json');
const m23 = rd('data-m23-nofold.json');
const m18 = rd('data-m18-targets.json');
const m19 = rd('data-m19-links.json');
const m17 = rd('data-m17-keyboard.json');
const m14 = rd('data-m14-rail.json');
const m4 = rd('data-m4-row.json');
const m16 = rd('data-m16-readcost.json');

const o = [];
const P = (s) => o.push(s);

// ── 列表 ──
P('#### 表 L1 · 列表页基线（定稿快照，2026-10-27T10:27:52Z）\n');
P('| 指标 | 390×844 | 414×896 | 1440×900 |');
P('|---|---|---|---|');
const L = d.list;
const r1 = (label, f) => P(`| ${label} | ${f(L['390']['A0 现状'])} | ${f(L['414']['A0 现状'])} | ${f(L['1440']['A0 现状'])} |`);
r1('.mast 页头高', (x) => x.mastH);
r1('.rail 筛选栏可见高', (x) => x.railH);
r1('.bar 工具条高', (x) => x.barH);
r1('首个行卡 top', (x) => x.firstRowTop);
r1('首个行卡高度', (x) => x.firstRowH);
r1('首个行卡 bottom', (x) => x.firstRowBottom);
r1('首屏完整卡数', (x) => x.complete);
r1('首卡可见比例', (x) => x.firstVisiblePct + '%');
r1('行脚注是否完整可见', (x) => (x.footFull ? '是' : '**否**'));
r1('页面 scrollHeight', (x) => x.docH);
r1('横向溢出', (x) => x.overflowX);
r1('#q-parked 假控件是否渲染', (x) => (x.qparkedVisible ? `**是（${x.qparkedH}px）**` : '否'));
P('');
P('### 1.2 列表首屏 5 级递进（390 / 414 / 1440）\n');
const keys = Object.keys(L['390']);
P('| 步骤 | 390 mast/rail/bar | 390 首卡 top | 390 完整卡 | 414 首卡 top | 414 完整卡 | 1440 首卡 top | 1440 完整卡 |');
P('|---|---|---|---|---|---|---|---|');
for (const k of keys) {
  const a = L['390'][k], b = L['414'][k], c = L['1440'][k];
  P(`| ${k} | ${a.mastH} / ${a.railH} / ${a.barH} | ${a.firstRowTop} | ${a.complete} | ${b.firstRowTop} | ${b.complete} | ${c.firstRowTop} | ${c.complete} |`);
}
P('');
P('逐步的 delta（390）：\n');
P('| 步骤 | 首卡 top | Δ 相对上一步 | Δ 相对现状 | 完整卡 |');
P('|---|---|---|---|---|');
let prev = L['390'][keys[0]].firstRowTop;
const base0 = prev;
for (const k of keys) {
  const v = L['390'][k].firstRowTop;
  P(`| ${k} | ${v} | ${(v - prev).toFixed(1)} | ${(v - base0).toFixed(1)} | ${L['390'][k].complete} |`);
  prev = v;
}
P('');

// ── rail / mast 构成 ──
P('### 1.3 `.rail` 与 `.mast` 的构成（390，定稿前测量）\n');
P('`.rail` 可见高 **337.6px**（`max-height:40vh` = 337.6px，即 844×0.4），但内部 `scrollHeight` **1406px**：11 组筛选、47 颗芯片全在里面，用户要在**这条 337px 的窄框里单独内滚 1070px** 才能看到第 2–11 组。\n');
P('| rail 内块 | top（相对 rail） | 高度 | 芯片数 |');
P('|---|---|---|---|');
P('| 你是做什么的（含 3 个模板角标 + 「还有 28 个」） | 12 | 212.4 | 20 |');
P('| 要亮底还是暗底 | 246.4 | 51.2 | 2 |');
P('| 底色属于哪条带 | 319.6 | 176.2 | 6 |');
P('| 要装多少内容 | 517.8 | 51.2 | 3 |');
P('| 要安静还是要扎眼 | 591 | 101.1 | 3 |');
P('| — 分隔说明「以下是设计口径与质检状态」 | 718.1 | 37 | — |');
P('| 结构类型 | 771.2 | 51.2 | 2 |');
P('| 认知门槛 | 844.4 | 51.2 | 3 |');
P('| 调性 | 917.6 | 148 | 7 |');
P('| 建成状态 | 1087.5 | 51.2 | 1 |');
P('| 闸门 | 1160.7 | 51.2 | 4 |');
P('| 怎么用（说明段，不可点） | 1233.9 | 138.3 | — |');
P('');
P('`.mast` **488.6px** = kicker 22.7 + h1 27.5 + claim **128.0** + wizard 69.8 + exit 76.1 + gap + facts 73.5 + padding。其中**两段散文（claim 128 + exit 76.1 = 204.1px，占页头 41.8%）**和 wizard 按钮（69.8px）合计 273.9px，是页头里最贵的三块。\n');

// ── 详情 ──
P('### 表 D1 · 详情面板 scrollHeight / 屏数（定稿快照，30 案）\n');
P('| 案 | 390 scrollH | 390 屏数 | 414 scrollH | 414 屏数 | 1440 scrollH | 1440 屏数 |');
P('|---|---|---|---|---|---|---|');
for (const id of Object.keys(d.detail['390']).sort()) {
  const a = d.detail['390'][id]['B0 现状'], b = d.detail['414'][id]['B0 现状'];
  const c = m2.vps['1440'].find((x) => x.id === id);
  P(`| ${id} | ${a.scrollH} | ${a.screens} | ${b.scrollH} | ${b.screens} | ${c.detail.scrollHeight} | ${c.detail.screens} |`);
}
const agg = (vp, k) => {
  const a = Object.values(d.detail[vp]).map((x) => x[k]);
  const sh = a.map((x) => x.scrollH);
  return { min: Math.min(...sh), max: Math.max(...sh), avg: Math.round(sh.reduce((p, q) => p + q, 0) / a.length), over: sh.filter((x) => x > 3800).length, p50: sh.sort((x, y) => x - y)[15] };
};
for (const vp of ['390', '414']) {
  const s = agg(vp, 'B0 现状');
  P(`| **${vp} 汇总** | min ${s.min} / 中位 ${s.p50} / max ${s.max} / avg ${s.avg} | 超 3800：**${s.over}/30** | | | | |`);
}
P('');

// 桶分解
P('### 表 D2 · scrollHeight 三段拆解（30 案平均，390）\n');
P('| 桶 | 高度 | 占 scrollH | 说明 |');
P('|---|---|---|---|');
const b390 = m2.vps['390'].map((c) => {
  const folds = c.folds.reduce((a, b) => a + b.h, 0);
  const proto = c.openProto ? c.openProto.h : 0;
  return { sh: c.detail.scrollHeight, head: c.head.h, cta: c.promptCta.h, proto, folds, fields: c.fieldsDl.h, other: c.detail.scrollHeight - c.head.h - c.promptCta.h - proto - folds - c.fieldsDl.h };
});
const avgk = (k) => Math.round(b390.reduce((a, b) => a + b[k], 0) / 30);
const pctk = (k) => (b390.reduce((a, b) => a + b[k] / b.sh * 100, 0) / 30).toFixed(1);
P(`| 详情头部 .detail-head（sticky） | ${avgk('head')} | ${pctk('head')}% | 97.5 / 76.4 两值，随标题是否折行 |`);
P(`| 提示词块 .prompt-cta | ${avgk('cta')} | ${pctk('cta')}% | 按钮 45.9 + 2 输入框 37×2 + 说明段；296.4 / 317.5 / 338.5 三值 |`);
P(`| 打开原型 .open-proto | ${avgk('proto')} | ${pctk('proto')}% | 恒 40.7 |`);
P(`| 3 个折叠块（预览/闸门/上站文案，收起态） | ${avgk('folds')} | ${pctk('folds')}% | **恒 131.0**（48.5 + 32.0 + 48.5） |`);
P(`| 字段区 .fields（含第 4 折叠块 45.8） | ${avgk('fields')} | **${pctk('fields')}%** | 2852–3940 |`);
P(`| 其他（body padding 12+60、块间隙） | ${avgk('other')} | ${pctk('other')}% | 恒 119.9 |`);
P(`| **合计** | **${['head', 'cta', 'proto', 'folds', 'fields', 'other'].reduce((a, k) => a + avgk(k), 0)}** | 100% | |`);
P('');
P('> **「字段本体占 81–84%」复核结论：成立，但口径要说清。** 实测 30 案字段区占 **80.6–85.5%**（平均 83.5%），与上一轮报的 81–84% 一致。但「字段区」不等于「内容」—— 字段区内部还有 **288px 内距 + 251.8px 标签 + 12px 分隔线 = 551.8px（占字段区 15.0–19.3%）**，这部分是纯布局开销，不是内容。见 D4。\n');

// 字段明细
P('### 表 D3 · 逐字段高度（30 案平均，390）\n');
P('| 字段 | 390 avg | 390 min–max | 414 avg | 1440 avg | 占 390 scrollH | 字数 avg |');
P('|---|---|---|---|---|---|---|');
const byLabel = {};
m2.vps['390'].forEach((c) => c.fields.forEach((f) => { const k = f.label.replace(/（.*/, ''); (byLabel[k] = byLabel[k] || []).push(f); }));
const shAvg = m2.vps['390'].reduce((a, c) => a + c.detail.scrollHeight, 0) / 30;
const bl = (vp) => { const m = {}; m2.vps[vp].forEach((c) => c.fields.forEach((f) => { const k = f.label.replace(/（.*/, ''); (m[k] = m[k] || []).push(f.h); })); return m; };
const b414 = bl('414'), b1440 = bl('1440');
Object.entries(byLabel).map(([k, a]) => ({
  k, avg: a.reduce((x, y) => x + y.h, 0) / a.length, min: Math.min(...a.map((f) => f.h)), max: Math.max(...a.map((f) => f.h)),
  ch: a.reduce((x, y) => x + y.chars, 0) / a.length,
})).sort((a, b) => b.avg - a.avg).forEach((r) => {
  P(`| ${r.k} | ${Math.round(r.avg)} | ${Math.round(r.min)}–${Math.round(r.max)} | ${Math.round((b414[r.k] || [0]).reduce((x, y) => x + y, 0) / (b414[r.k] || [1]).length)} | ${Math.round((b1440[r.k] || [0]).reduce((x, y) => x + y, 0) / (b1440[r.k] || [1]).length)} | ${(r.avg / shAvg * 100).toFixed(1)}% | ${Math.round(r.ch)} |`);
});
P('');

// 字段区内部
P('### 表 D4 · 字段区内部拆解（390，5 案逐项实测）\n');
P('| 案 | 字段区总高 | 正文 dd | 标签 dt | 内距 padding | 分隔线 | 布局开销合计 |');
P('|---|---|---|---|---|---|---|');
for (const id of ['S01', 'S08', 'S13', 'S15', 'S26']) {
  const s = m8['390'][id];
  const labels = s.rows.reduce((a, r) => a + r.labH, 0), pad = s.rows.reduce((a, r) => a + r.pad, 0), border = s.rows.reduce((a, r) => a + r.border, 0);
  const text = s.dlH - labels - pad - border;
  const overhead = labels + pad + border;
  P(`| ${id} | ${s.dlH.toFixed(1)} | ${text.toFixed(1)}（${(text / s.dlH * 100).toFixed(1)}%） | ${labels.toFixed(1)}（${(labels / s.dlH * 100).toFixed(1)}%） | ${pad.toFixed(1)}（${(pad / s.dlH * 100).toFixed(1)}%） | ${border.toFixed(1)} | ${overhead.toFixed(1)}（**${(overhead / s.dlH * 100).toFixed(1)}%**） |`);
}
P('');

// 最长3字段
P('### 表 D5 · 每案最长 3 个字段占字段区比例（390）\n');
P('| 案 | 字段区 | 最长 3 个合计 | 占比 | 是哪三个 |');
P('|---|---|---|---|---|');
const t15 = m2.vps['390'].map((c) => {
  const fs = c.fields.map((f) => ({ label: f.label.replace(/（.*/, ''), h: f.h })).sort((a, b) => b.h - a.h);
  const top3 = fs.slice(0, 3).reduce((a, b) => a + b.h, 0);
  return { id: c.id, fh: c.fieldsDl.h, top3, pct: top3 / c.fieldsDl.h * 100, names: fs.slice(0, 3).map((f) => f.label).join(' / ') };
});
t15.forEach((r) => P(`| ${r.id} | ${r.fh} | ${r.top3.toFixed(1)} | ${r.pct.toFixed(1)}% | ${r.names} |`));
P(`| **平均** | | | **${(t15.reduce((a, b) => a + b.pct, 0) / 30).toFixed(1)}%** | 区间 ${Math.min(...t15.map((r) => r.pct)).toFixed(1)}–${Math.max(...t15.map((r) => r.pct)).toFixed(1)}% |`);
P('');

// 方案总表
P('### 表 D6 · 详情压深方案实测（30 案全量，按 scrollH 排序）\n');
const VLAB = {
  V0: '现状', VA: '甲 前3展开其余9折', VA5: '甲5 前5展开其余7折', VB: '乙 4长字段折', VB5: '乙5 +字体策略折',
  VC: '丙 字段导航条', VD: '诊断 只折CTA', VE: '戊 乙+排版收紧', VF: '己 乙+收紧+CTA折',
  VG: '庚 乙5+收紧+CTA折+首块折',
};
P('| 方案 | 390 scrollH min–max (avg) | 390 最大屏数 | 390 超3800 | 414 avg | 414 超3800 | 首屏完整字段(390) | 折叠块数 |');
P('|---|---|---|---|---|---|---|---|');
const rows6 = Object.entries(VLAB).map(([k, lab]) => {
  const a = Object.values(m5).map((x) => x[k]), b = Object.values(m5b).map((x) => x[k]);
  const sh = a.map((x) => x.scrollH), sh2 = b.map((x) => x.scrollH);
  return { k, lab, min: Math.min(...sh), max: Math.max(...sh), avg: Math.round(sh.reduce((p, q) => p + q, 0) / 30), scr: Math.max(...a.map((x) => x.screens)), over: sh.filter((x) => x > 3800).length, avg2: Math.round(sh2.reduce((p, q) => p + q, 0) / 30), over2: sh2.filter((x) => x > 3800).length, ff: (a.reduce((p, q) => p + q.fieldsFullyInFirstScreen, 0) / 30).toFixed(1) };
}).sort((a, b) => a.avg - b.avg);
for (const r of rows6) P(`| **${r.k}** ${r.lab} | ${r.min}–${r.max} (${r.avg}) | ${r.scr.toFixed(2)} | ${r.over}/30 | ${r.avg2} | ${r.over2}/30 | ${r.ff} | — |`);
P('');
P('补充组合（表 D7）：\n');
P('| 方案 | 390 scrollH min–max (avg) | 390 超3800 | 414 avg | CTA 块高 | 折叠字段数 |');
P('|---|---|---|---|---|---|');
for (const k of Object.keys(m15.vps['390'].S01)) {
  const a = Object.values(m15.vps['390']).map((x) => x[k]), b = Object.values(m15.vps['414']).map((x) => x[k]);
  const sh = a.map((x) => x.scrollH), sh2 = b.map((x) => x.scrollH);
  P(`| ${k} | ${Math.min(...sh)}–${Math.max(...sh)} (${Math.round(sh.reduce((p, q) => p + q, 0) / 30)}) | ${sh.filter((x) => x > 3800).length}/30 | ${Math.round(sh2.reduce((p, q) => p + q, 0) / 30)} | ${a[0].ctaH} | ${a[0].foldedCount} |`);
}
P('');
P('「不折任何字段」路线（表 D8）：\n');
P('| 方案 | 390 scrollH min–max (avg) | ≤3800 | 首屏完整字段 | 字段数 |');
P('|---|---|---|---|---|');
for (const k of Object.keys(m23.vps['390'].S01)) {
  const a = Object.values(m23.vps['390']).map((x) => x[k]);
  const sh = a.map((x) => x.scrollH);
  P(`| ${k} | ${Math.min(...sh)}–${Math.max(...sh)} (${Math.round(sh.reduce((p, q) => p + q, 0) / 30)}) | ${sh.filter((x) => x <= 3800).length}/30 | ${(a.reduce((p, q) => p + q.fieldsFully, 0) / 30).toFixed(1)} | ${a[0].fieldCount} |`);
}
P('');

// 排版
P('### 表 D9 · 只改排版（不动字段、不折任何东西，390，30 案）\n');
P('| 变体 | CSS | scrollH min–max (avg) | ≤3800 | 平均省 |');
P('|---|---|---|---|---|');
const ids9 = Object.keys(m9.data);
const base9 = ids9.map((id) => m9.data[id].T0.scrollH);
for (const [k, label] of Object.entries(m9.defs)) {
  const a = ids9.map((id) => m9.data[id][k].scrollH);
  const dd = a.map((x, i) => x - base9[i]);
  P(`| ${k} | ${label} | ${Math.min(...a)}–${Math.max(...a)} (${Math.round(a.reduce((p, q) => p + q, 0) / 30)}) | ${a.filter((x) => x <= 3800).length}/30 | ${Math.round(dd.reduce((p, q) => p + q, 0) / 30)} px |`);
}
P('');

// 推荐方案详情
P('### 表 D10 · 推荐方案（B1）逐案结果，390\n');
P('| 案 | 现状 scrollH | 推荐 scrollH | Δ | 降幅 | 现状屏数 | 推荐屏数 | 首屏完整字段（现状→推荐） |');
P('|---|---|---|---|---|---|---|---|');
for (const id of Object.keys(d.detail['390']).sort()) {
  const a = d.detail['390'][id]['B0 现状'], b = d.detail['390'][id]['B1 推荐'];
  P(`| ${id} | ${a.scrollH} | ${b.scrollH} | ${b.scrollH - a.scrollH} | ${((b.scrollH - a.scrollH) / a.scrollH * 100).toFixed(1)}% | ${a.screens} | ${b.screens} | ${a.fieldsFully} → ${b.fieldsFully} |`);
}
const s390a = Object.values(d.detail['390']).map((x) => x['B0 现状'].scrollH);
const s390b = Object.values(d.detail['390']).map((x) => x['B1 推荐'].scrollH);
P(`| **汇总** | ${Math.min(...s390a)}–${Math.max(...s390a)} (avg ${Math.round(s390a.reduce((p, q) => p + q, 0) / 30)}) | ${Math.min(...s390b)}–${Math.max(...s390b)} (avg ${Math.round(s390b.reduce((p, q) => p + q, 0) / 30)}) | ${Math.round((s390b.reduce((p, q) => p + q, 0) - s390a.reduce((p, q) => p + q, 0)) / 30)} | ${((s390b.reduce((p, q) => p + q, 0) - s390a.reduce((p, q) => p + q, 0)) / s390a.reduce((p, q) => p + q, 0) * 100).toFixed(1)}% | max ${Math.max(...Object.values(d.detail['390']).map((x) => x['B0 现状'].screens))} | max ${Math.max(...Object.values(d.detail['390']).map((x) => x['B1 推荐'].screens))} | — |`);
P('');

// 触控
P('### 表 T11 · 触控目标（详情面板，S01，现状）\n');
P('| 元素 | 390 h×w | 1440 h×w | ≥24×24 | ≥44×44 |');
P('|---|---|---|---|---|');
const t390 = m18['390'].detail.items, t1440 = m18['1440'].detail.items;
for (let i = 0; i < t390.length; i++) {
  const a = t390[i], b = t1440[i];
  P(`| ${a.tag} · ${a.text || '（缩略图）'} | ${a.h}×${a.w} | ${b ? b.h + '×' + b.w : '—'} | ${a.h >= 24 && a.w >= 24 ? '✓' : '**✗**'} | ${a.h >= 44 && a.w >= 44 ? '✓' : '✗'} |`);
}
P('');
P('列表页控件：\n');
P('| 控件 | 390 高 | 1440 高 | 间距 | ≥24 |');
P('|---|---|---|---|---|');
const lc = (n, k) => { const a = m18['390'].list[k][0], b = m18['1440'].list[k][0]; P(`| ${n} | ${a.h} | ${b.h} | ${n.includes('芯片') ? 'gap 5px' : '—'} | ${a.h >= 24 ? '✓' : '**✗**'} |`); };
P(`| 场景芯片 .scene-chip | ${m18['390'].list.sceneChipH.min}–${m18['390'].list.sceneChipH.max} | ${m18['1440'].list.sceneChipH.min}–${m18['1440'].list.sceneChipH.max} | gap 5px | ✓（但 <44） |`);
P(`| 筛选芯片 .chips button | ${m18['390'].list.chipH.min}–${m18['390'].list.chipH.max} | ${m18['1440'].list.chipH.min}–${m18['1440'].list.chipH.max} | gap 5px | ✓（但 <44） |`);
lc('搜索框 #q', 'search'); lc('排序 #sort', 'sort'); lc('清空 #reset', 'reset'); lc('场景展开 .scene-toggle', 'toggle');
P('');
P(`**唯一真正违反 WCAG 2.2 2.5.8 的**（用「24px 圆是否与邻居相交」这条间距豁免实测）：390 档**页头两个模板链接** —— \`企业站 M01\`（72×20）与 \`餐饮本地 M02\`（86×20），它们的 24px 圆**都撞到** \`作品集 M03\`，不满足豁免 ⇒ **真失败 2 处**。1440 档同样三个链接但间距足够，靠豁免通过（3/3）。\n`);
P(`详情面板里唯一 <24px 的是「去 AI 味审查点」summary（**20.8px**），但它的 24px 圆上下都无人相交 ⇒ 靠间距豁免**合规**。\n`);

// 键盘
P('### 表 T12 · 键盘实测（真实 `Input.dispatchKeyEvent`，390 与 1440 结果相同）\n');
P('| 目标 | 第几次 Tab |');
P('|---|---|');
const tg = m17['390'].tabTargets;
P(`| 进入 \`#detail\` 的第一个可聚焦元素 | **${tg.firstInDetail}** |`);
P(`| 提示词输入框 | ${tg.firstInput} |`);
P(`| 第一个 \`<summary>\`（预览折叠条） | ${tg.firstSummary} |`);
P(`| 打开原型链接 | ${tg.openProto} |`);
P(`| 闸门折叠条 | ${tg.foldGate} |`);
P(`| 「去 AI 味审查点」折叠条 | ${tg.fieldFold} |`);
P('');
P('**「Tab 到折叠条要按 114 次」复核：不成立，实测是 91 次**（进面板第一个控件 87 次）。114 这个数在当前树上复现不出来。方向是对的（`#detail` 在 DOM 末尾，排在 30 张行卡之后），但数值要改。\n');

// 展开成本
P('### 表 T13 · 折叠方案的「展开成本」（读完全部要展开几次）\n');
P('| 案 | 现状：折叠态 → 全展开 | 现状 details 数 | 推荐(乙+CTA折)：折叠态 → 全展开 | details 数 |');
P('|---|---|---|---|---|');
for (const id of ['S01', 'S13', 'S26']) {
  const b = m16.data['390'][id].baseline, v = m16.data['390'][id].VH;
  P(`| ${id} | ${b.foldedH} → ${b.expandedH}（+${b.expandedH - b.foldedH}） | ${b.detailCount} | ${v.foldedH} → ${v.expandedH}（+${v.expandedH - v.foldedH}） | ${v.detailCount} |`);
}
P('');

// 单卡
P('### 表 R1 · 390 档单张行卡解剖（S01，577.8px）\n');
P('| 部位 | top（相对卡顶） | 高度 |');
P('|---|---|---|');
const A = m4.vps['390'].anatomy;
const PN = { no: '编号 .no', head: '标题行 .row-head', def: '一句话定义 .row-def（clamp 3 行，本卡 1 行）', meta: '元数据行 .row-meta', family: '美学家族 .row-family（clamp 2 行，本卡 2 行）', swatches: '色块 .swatches', shots: '截图列 .shots', shotImg: '截图本体 img（max-height 190 生效→164.3）', shotCap: '图注 figcaption', foot: '行脚注 .row-foot（94.2，三行 WARN 列表）' };
for (const [k, label] of Object.entries(PN)) { const v = A.parts[k]; if (v) P(`| ${label} | ${v.top} | ${v.h} |`); }
P(`| **合计** | | **${A.rowH}** |`);
P('');
P('单卡压缩实验（390，DOM 动态改）：\n');
P('| 实验 | 做法 | 卡高 | Δ |');
P('|---|---|---|---|');
for (const e of m4.vps['390'].exps) P(`| ${e.key} | ${e.label} | ${e.firstRowH} | ${(e.firstRowH - 577.8).toFixed(1)} |`);
P('');

writeFileSync(new URL('./tables2.md', import.meta.url), o.join('\n'), 'utf8');
console.log('wrote tables2.md lines=' + o.length);
