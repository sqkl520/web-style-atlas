// p-typography.mjs — 详情面板 390×844 排版基线 + 压缩方案的读数代价
// 只读：全部改动都是注入 <style> / 运行时 DOM 操作，不写 prototypes/
//
// CDP 陷阱：Browser.launch({width}) 只改 --window-size，不建视口。
// 必须 page.setViewport({width:390,height:844,mobile:true})（见 cdp.mjs:103-110 / :142-146）。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const SHOTS = join(HERE, 'shots');
mkdirSync(SHOTS, { recursive: true });

const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

// ── 变体：R2 逐字照抄 66-audit/m32-definitive.mjs:83-84，其余是围绕它的参数扫描 ──
const VARIANTS = {
  'V0 现状': '',
  'R2 审计方案（lh1.5 / 内距8 / dt2 / 内宽10）':
    '#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}#detail .field dt{margin-bottom:2px}'
    + '#d-body{padding-left:10px;padding-right:10px}',
  'A 只压行高 1.5（内距/内宽不动）': '#detail .field dd{line-height:1.5}',
  'B 只压内距 8（行高不动）': '#detail .field{padding:8px 0}#detail .field dt{margin-bottom:2px}',
  'C 只压内宽 10（行高不动）': '#d-body{padding-left:10px;padding-right:10px}',
  'D 行高 1.45（越线探底）': '#detail .field{padding:8px 0}#detail .field dd{line-height:1.45}'
    + '#detail .field dt{margin-bottom:2px}#d-body{padding-left:10px;padding-right:10px}',
  'E 行高 1.40（明显越线）': '#detail .field{padding:8px 0}#detail .field dd{line-height:1.4}'
    + '#detail .field dt{margin-bottom:2px}#d-body{padding-left:10px;padding-right:10px}',
  'F 内宽 0 + 内距 6 + lh1.5（极限）': '#detail .field{padding:6px 0}#detail .field dd{line-height:1.5}'
    + '#detail .field dt{margin-bottom:2px}#d-body{padding-left:0;padding-right:0}',
  'G 行高 1.75（往松里做，对照组）': '#detail .field dd{line-height:1.75}',
};

// 逐元素取"这一行长什么样"：用 Range.getClientRects() 数行盒，宽/字号 ≈ 每行汉字数
// ⚠️ 必须写成函数体内部的局部函数：PROBE 会被 toString 后在页面里求值，外部 const 不可见。
const METRICS_SRC = `function METRICS(sel) {
  const els = Array.from(document.querySelectorAll(sel));
  return els.map((el) => {
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    const r = el.getBoundingClientRect();
    const contentW = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let chars = 0; const nodes = [];
    while (walker.nextNode()) {
      const t = walker.currentNode.nodeValue || '';
      const n = t.replace(/\s+/g, '').length;
      if (n) { chars += n; nodes.push(walker.currentNode); }
    }
    const range = document.createRange();
    const lines = [];
    for (const n of nodes) {
      range.selectNodeContents(n);
      for (const rc of range.getClientRects()) {
        if (rc.height < 1) continue;
        const hit = lines.find((l) => Math.abs(l.top - rc.top) < 2);
        if (hit) hit.w += rc.width; else lines.push({ top: rc.top, w: rc.width });
      }
    }
    lines.sort((a, b) => a.top - b.top);
    const lineH = parseFloat(cs.lineHeight);
    return {
      cls: el.className || el.tagName,
      fs, lh: lineH, lhRatio: +(lineH / fs).toFixed(3),
      leading: +(lineH - fs).toFixed(2),
      ls: cs.letterSpacing, ws: cs.wordSpacing,
      contentW: +contentW.toFixed(1),
      padT: parseFloat(cs.paddingTop), padB: parseFloat(cs.paddingBottom),
      chars, nLines: lines.length,
      cap: Math.floor(contentW / fs),                       // 理论每行容量（汉字满宽 = 1em）
      avgCpl: +(chars / Math.max(1, lines.length)).toFixed(1),
      maxLineW: +Math.max(0, ...lines.map((l) => l.w)).toFixed(1),
      tallestLineW: +(Math.max(0, ...lines.map((l) => l.w)) / fs).toFixed(1),
      h: +r.height.toFixed(1),
    };
  });
}`;

const PROBE = (metricsSrc) => {
  // PROBE 被 toString 后在页面里求值，外部作用域不可见；用间接 eval 取回 METRICS
  const METRICS = (0, eval)('(' + metricsSrc + ')');
  const d = document.getElementById('detail');
  const body = document.getElementById('d-body');
  const dl = body.querySelector('.fields');
  const dds = Array.from(dl.querySelectorAll('.field dd'));
  const dts = Array.from(dl.querySelectorAll('.field dt'));
  const f0 = dl.querySelector('.field');
  const dd0 = f0.querySelector('dd');
  const cs = (e) => getComputedStyle(e);
  const ddr = dd0.getBoundingClientRect();
  const dtr = f0.querySelector('dt').getBoundingClientRect();
  const fields = Array.from(dl.children).map((el, i) => {
    const r = el.getBoundingClientRect();
    return {
      i, label: (el.querySelector('dt') || el.querySelector('summary') || {}).textContent || '?',
      h: +r.height.toFixed(1),
      padT: parseFloat(cs(el).paddingTop), padB: parseFloat(cs(el).paddingBottom),
    };
  });
  // 字段与字段之间的实际视觉间隙 = 上一块 padding-bottom + 线 + 下一块 padding-top
  const gaps = [];
  for (let i = 1; i < fields.length; i++) {
    const prev = dl.children[i - 1].getBoundingClientRect();
    const cur = dl.children[i].getBoundingClientRect();
    gaps.push(+(cur.top - prev.bottom).toFixed(1));
  }
  const csBody = cs(body), csDl = cs(dl), csDd = cs(dd0), csDt = cs(dts[0]);
  return {
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    detail: { clientW: d.clientWidth, clientH: d.clientHeight, scrollH: d.scrollHeight, scrollW: d.scrollWidth },
    screens: +(d.scrollHeight / d.clientHeight).toFixed(2),
    body: {
      padL: parseFloat(csBody.paddingLeft), padR: parseFloat(csBody.paddingRight),
      padT: parseFloat(csBody.paddingTop), padB: parseFloat(csBody.paddingBottom),
      w: +body.getBoundingClientRect().width.toFixed(1),
    },
    fields: { padL: parseFloat(csDl.paddingLeft), padR: parseFloat(csDl.paddingRight), borderTop: parseFloat(csDl.borderTopWidth), h: +dl.getBoundingClientRect().height.toFixed(1) },
    dd: {
      fs: csDd.fontSize, lh: csDd.lineHeight, lhRatio: +(parseFloat(csDd.lineHeight) / parseFloat(csDd.fontSize)).toFixed(3),
      ls: csDd.letterSpacing, ws: csDd.wordSpacing, ti: csDd.textIndent,
      w: +ddr.width.toFixed(1), x: +ddr.left.toFixed(1), right: +(ddr.left + ddr.width).toFixed(1),
      family: csDd.fontFamily,
      textAlign: csDd.textAlign, wordBreak: csDd.wordBreak, overflowWrap: csDd.overflowWrap,
      textSpacing: csDd.textAutospace || csDd.textSpacingTrim || 'n/a',
    },
    dt: {
      fs: csDt.fontSize, lh: csDt.lineHeight, lhRatio: +(parseFloat(csDt.lineHeight) / parseFloat(csDt.fontSize)).toFixed(3),
      mb: parseFloat(csDt.marginBottom), ls: csDt.letterSpacing,
      h: +dtr.height.toFixed(1), w: +dtr.width.toFixed(1),
      // dt 盒底 → dd 盒顶 的净空
      gapToDd: +(ddr.top - dtr.bottom).toFixed(1),
      // dt 文本基线下沿 → dd 首行顶 的实际空隙 ≈ gapToDd + (dt 行高 - dt 字号)/2 + (dd 行高 - dd 字号)/2
      opticalGap: +(ddr.top - dtr.bottom + (parseFloat(csDt.lineHeight) - parseFloat(csDt.fontSize)) / 2 + (parseFloat(csDd.lineHeight) - parseFloat(csDd.fontSize)) / 2).toFixed(1),
    },
    field: {
      padT: parseFloat(cs(f0).paddingTop), padB: parseFloat(cs(f0).paddingBottom),
      borderB: parseFloat(cs(f0).borderBottomWidth), h: +f0.getBoundingClientRect().height.toFixed(1),
      gapBetween: gaps.length ? +(gaps[0]).toFixed(1) : null,
      margins: [cs(f0).marginTop, cs(f0).marginBottom],
    },
    fieldCount: dds.length,
    // 变量来源核对
    vars: {
      s16: getComputedStyle(document.documentElement).getPropertyValue('--s-16').trim(),
      s13: getComputedStyle(document.documentElement).getPropertyValue('--s-13').trim(),
      rootLh: cs(document.body).lineHeight, rootFs: cs(document.body).fontSize,
    },
    ddMetrics: METRICS('#d-body .fields .field dd'),
    foldBodyMetrics: METRICS('#d-body .field-fold .fold-body'),
    summaryMetrics: METRICS('#d-body .field-fold summary'),
    noteMetrics: METRICS('#d-body .prompt-fill-note'),
    partsMetrics: METRICS('#d-body .parts li'),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), variants: VARIANTS, data: {}, shots: {} };

const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
// 反证 launch 不生效（本探针自证视口确实是 390）
await p.goto(PAGE, { settleMs: 1600 });
out.viewportProof = await p.eval(() => ({ iw: innerWidth, ih: innerHeight, dpr: devicePixelRatio }));

for (const id of IDS) {
  out.data[id] = {};
  for (const [name, css] of Object.entries(VARIANTS)) {
    await p.eval((sid) => {
      document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
      const r = document.querySelector('.row[data-id="' + sid + '"]');
      if (r) r.click();
      document.getElementById('detail').scrollTop = 0;
    }, id);
    await new Promise((r) => setTimeout(r, 120));
    if (css) {
      await p.eval((c) => {
        const st = document.createElement('style'); st.setAttribute('data-lab', '1'); st.textContent = c;
        document.head.appendChild(st);
      }, css);
      await new Promise((r) => setTimeout(r, 80));
    }
    out.data[id][name] = await p.eval(PROBE, METRICS_SRC);
  }
  const b = out.data[id]['V0 现状'], r2 = out.data[id]['R2 审计方案（lh1.5 / 内距8 / dt2 / 内宽10）'];
  console.log(`${id} ${String(b.detail.scrollH).padStart(5)} → ${String(r2.detail.scrollH).padStart(5)}`
    + ` (${(100 * (r2.detail.scrollH - b.detail.scrollH) / b.detail.scrollH).toFixed(1)}%)`
    + ` ddW=${b.dd.w}/${r2.dd.w} cap=${b.ddMetrics[0].cap}/${r2.ddMetrics[0].cap}`
    + ` cpl=${b.ddMetrics[0].avgCpl}/${r2.ddMetrics[0].avgCpl}`
    + ` lines=${b.ddMetrics.reduce((s, x) => s + x.nLines, 0)}/${r2.ddMetrics.reduce((s, x) => s + x.nLines, 0)}`);
}

// ── 截图：同一字段区域，三种行高对照（390，dsf2，只裁正文区）──
{
  const p2 = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p2.goto(PAGE, { settleMs: 1500 });
  for (const [name, css, file] of [
    ['V0 现状', '', 'typo-V0-lh162.png'],
    ['R2 审计方案（lh1.5 / 内距8 / dt2 / 内宽10）', VARIANTS['R2 审计方案（lh1.5 / 内距8 / dt2 / 内宽10）'], 'typo-R2-lh150.png'],
    ['D 行高 1.45（越线探底）', VARIANTS['D 行高 1.45（越线探底）'], 'typo-D-lh145.png'],
  ]) {
    await p2.eval((c) => {
      document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
      document.querySelector('.row[data-id="S01"]').click();
      const d = document.getElementById('detail');
      if (c) { const st = document.createElement('style'); st.setAttribute('data-lab', '1'); st.textContent = c; document.head.appendChild(st); }
      // 定位到「布局与网格」字段，滚到它顶端
      const target = Array.from(document.querySelectorAll('#d-body .fields .field'))
        .find((f) => (f.querySelector('dt') || {}).textContent === '布局与网格');
      d.scrollTop = target.offsetTop - 8;
    }, css);
    await new Promise((r) => setTimeout(r, 220));
    await p2.screenshot({ path: join(SHOTS, file), format: 'png' });
    out.shots[name] = file;
  }
  await p2.close();
}

await p.close();
writeFileSync(join(HERE, 'data-typography.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('written data-typography.json');
