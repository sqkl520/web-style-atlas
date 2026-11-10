/**
 * p3-classify-deltae.mjs —— 把「集合外颜色」分成三类，为缺陷 1 的修法提供判决表。
 *
 * 为什么必须有这一层：p1 已经把"集合外颜色"量成了像素与墨迹面积，但**"外"不等于"错"**。
 * 有两种情况必须分开，否则会得出相反结论：
 *   ① 提示词写 #0B0B0F、CSS 里却写了 #0A0A0D（S02 实测）—— 两个色在屏幕上分不出来，
 *      补进提示词只是把提示词从 7 色撑到 9 色，反而稀释注意力。**不该补**。
 *   ② 提示词里根本没有 #5E5443，而它画了 966 个字（S19 实测）—— 这是漏掉了骨架色。
 *      **必须补**，否则 AI 做出来的正文色一定和原型不同。
 *
 * 判据（纯算术，可复算，不依赖浏览器）：
 *   ΔE00 —— CIEDE2000 色差（用 sRGB → Lab，D65）。阈值取 3.0：
 *     ΔE < 3 是"并排才看得出"的量级；> 3 是普通人一眼能分辨的不同色。
 *   inkShare —— 来自 p1 的墨迹承载度（该色画的字符面积 / 全部字符面积）。
 *
 * 三类：
 *   DUP      ΔE < 3  → 同一色的实现漂移，不补（可归一到提示词里的近值）
 *   MISSING  ΔE ≥ 3 且 inkShare ≥ 5%   → 骨架色被漏，必须补
 *   DECOR    ΔE ≥ 3 且 inkShare < 5%   → 装饰/面积色，按性价比决定
 *
 * 用法：node deliverables/70-plan/probes/p3-classify-deltae.mjs [--in p1-all30.json] [--json out.json]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const argVal = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const IN = resolve(HERE, argVal('--in', 'p1-all30.json'));
const OUT = resolve(HERE, argVal('--json', 'p3-deltae.json'));

/* ── sRGB → linear → XYZ(D65) → Lab ─────────────────────────────────────── */
const srgb2lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
function hexToLab(hex) {
  const r = srgb2lin(parseInt(hex.slice(1, 3), 16));
  const g = srgb2lin(parseInt(hex.slice(3, 5), 16));
  const b = srgb2lin(parseInt(hex.slice(5, 7), 16));
  const X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const Y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const Z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(X / 0.95047), fy = f(Y / 1.0), fz = f(Z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
/* CIEDE2000（Sharma 实现，跳过 hue 差值细节的常见坑） */
function deltaE00(lab1, lab2) {
  const [L1, a1, b1] = lab1, [L2, a2, b2] = lab2;
  const kL = 1, kC = 1, kH = 1;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));
  const ap1 = a1 * (1 + G), ap2 = a2 * (1 + G);
  const Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2);
  const hpf = (y, x) => { if (y === 0 && x === 0) return 0; let h = Math.atan2(y, x) * 180 / Math.PI; return h >= 0 ? h : h + 360; };
  const hp1 = hpf(b1, ap1), hp2 = hpf(b2, ap2);
  const dLp = L2 - L1, dCp = Cp2 - Cp1;
  let dhp = 0;
  if (Cp1 * Cp2 !== 0) {
    dhp = hp2 - hp1;
    if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(dhp * Math.PI / 360);
  const Lbarp = (L1 + L2) / 2, Cbarp = (Cp1 + Cp2) / 2;
  let hbarp = hp1 + hp2;
  if (Cp1 * Cp2 !== 0) {
    if (Math.abs(hp1 - hp2) > 180) hbarp = (hp1 + hp2 + (hp1 + hp2 < 360 ? 360 : -360)) / 2;
    else hbarp = (hp1 + hp2) / 2;
  }
  const T = 1 - 0.17 * Math.cos((hbarp - 30) * Math.PI / 180) + 0.24 * Math.cos(2 * hbarp * Math.PI / 180)
    + 0.32 * Math.cos((3 * hbarp + 6) * Math.PI / 180) - 0.20 * Math.cos((4 * hbarp - 63) * Math.PI / 180);
  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(Cbarp, 7) / (Math.pow(Cbarp, 7) + Math.pow(25, 7)));
  const SL = 1 + (0.015 * Math.pow(Lbarp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
  const SC = 1 + 0.045 * Cbarp, SH = 1 + 0.015 * Cbarp * T;
  const RT = -Math.sin(2 * dTheta * Math.PI / 180) * RC;
  return Math.sqrt(
    Math.pow(dLp / (kL * SL), 2) + Math.pow(dCp / (kC * SC), 2) + Math.pow(dHp / (kH * SH), 2)
    + RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
  );
}

/* 自测：CIEDE2000 的三组公开标准样例（Sharma et al. 2005 表 1） */
const T = [
  [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
  [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
  [[50, 2.5, 0], [50, 0, -2.5], 4.3065],
];
for (const [a, b, want] of T) {
  const got = deltaE00(a, b);
  if (Math.abs(got - want) > 0.001) throw new Error(`ΔE00 自测失败：期望 ${want} 得到 ${got.toFixed(4)}`);
}
console.log('ΔE00 自测通过（3 组 Sharma 标准样例，误差 <0.001）\n');

const src = JSON.parse(readFileSync(IN, 'utf8'));
const rows = [];
for (const r of src.rows) {
  const claimed = r.claimed;
  const claimedLab = claimed.map(h => [h, hexToLab(h)]);
  const outside = r.detail.filter(d => !d.inClaimed);
  const cls = outside.map(d => {
    const lab = hexToLab(d.hex);
    let best = null, bestDe = 1e9;
    for (const [h, l] of claimedLab) { const de = deltaE00(lab, l); if (de < bestDe) { bestDe = de; best = h; } }
    let kind;
    if (bestDe < 3) kind = 'DUP';
    else if (d.inkShare >= 5 || d.exactShare >= 1) kind = 'MISSING';
    else kind = 'DECOR';
    return { hex: d.hex, nearest: best, dE: +bestDe.toFixed(2), inkShare: d.inkShare, pxShare: d.exactShare, kind };
  });
  const missing = cls.filter(c => c.kind === 'MISSING').sort((a, b) => b.inkShare - a.inkShare);
  rows.push({ id: r.id, claimedN: r.claimedN, outsideN: r.outsideN, cls, missing });
  console.log(`${r.id}  外${String(r.outsideN).padStart(2)}  MISSING ${missing.length}  DUP ${cls.filter(c => c.kind === 'DUP').length}  DECOR ${cls.filter(c => c.kind === 'DECOR').length}` +
    (missing.length ? '  ← ' + missing.map(m => m.hex + '(ΔE' + m.dE + ',墨' + m.inkShare + '%)').join(' ') : ''));
}

writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), source: IN, rows }, null, 1), 'utf8');
const tot = rows.reduce((s, r) => s + r.missing.length, 0);
const cases = rows.filter(r => r.missing.length);
console.log('\n=== 需要补进提示词的「骨架色」 ===');
console.log(`案数 ${cases.length}/30，色数合计 ${tot}`);
for (const r of cases) console.log(`  ${r.id}: ${r.missing.map(m => m.hex + '(最近 ' + m.nearest + ', ΔE ' + m.dE + ', 墨 ' + m.inkShare + '%)').join('; ')}`);
const dups = rows.flatMap(r => r.cls.filter(c => c.kind === 'DUP').map(c => r.id + '/' + c.hex));
console.log(`\n实现漂移（ΔE<3，不补）：${dups.length} 个 → ${dups.join(' ')}`);
console.log('写到 ' + OUT);
