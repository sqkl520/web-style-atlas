// _p11_tail.mjs — 收尾核实：12px 的 30 个块是什么、--s-h1 是不是死变量、
// Esc 在折叠条上的真实行为、prompt-fill 是否真的被用（R2 折它有没有代价）。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const out = {};

// (a) 静态：--s-h1 是否被使用
{
  const css = readFileSync(join(ROOT, 'prototypes', '_selection', 'style.css'), 'utf8');
  const app = readFileSync(join(ROOT, 'prototypes', '_selection', 'app.js'), 'utf8');
  const html = readFileSync(join(ROOT, 'prototypes', '_selection', 'index.html'), 'utf8');
  const uses = (t) => (t.match(/var\(--s-h1\)/g) || []).length;
  out.deadVar = {
    sH1Decl: /--s-h1\s*:\s*[^;]+;/.test(css),
    sH1DeclValue: (css.match(/--s-h1\s*:\s*([^;]+);/) || [])[1] || null,
    usesInCss: uses(css), usesInApp: uses(app), usesInHtml: uses(html),
    mastH1Rule: (css.match(/\.mast h1 \{[^}]+\}/) || [''])[0].replace(/\s+/g, ' '),
  };
}

const browser = await Browser.launch({ width: 1440, height: 900 });

// (b) 12px 的块
{
  const p = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await p.goto(PAGE, { settleMs: 1500 });
  out.twelve = await p.eval(() => {
    const hits = [];
    document.querySelectorAll('body *').forEach((e) => {
      const hasOwn = Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasOwn) return;
      const b = e.getBoundingClientRect();
      if (b.height <= 0) return;
      const fs = parseFloat(getComputedStyle(e).fontSize);
      if (fs === 12) hits.push({ cls: (e.className || e.tagName).toString().slice(0, 30), txt: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 18), parent: (e.parentElement.className || e.parentElement.tagName).toString().slice(0, 24) });
    });
    const byCls = {};
    for (const h of hits) byCls[h.cls] = (byCls[h.cls] || 0) + 1;
    return { count: hits.length, byCls, sample: hits.slice(0, 5) };
  });
  // (c) prompt-fill 是否被读
  out.promptFill = await p.eval(() => {
    const fill = document.querySelector('#d-body .prompt-fill');
    const inputs = fill ? Array.from(fill.querySelectorAll('input')) : [];
    return {
      exists: !!fill, inputCount: inputs.length,
      ids: inputs.map((i) => i.id || i.name || i.placeholder.slice(0, 12)),
      copyBtnExists: !!document.querySelector('#d-body .prompt-copy'),
    };
  });
  await p.close();
}

// (d) Esc 在折叠条上：会不会关面板
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 1500 });
  await p.eval(() => { document.querySelector('.row[data-id="S01"]').click(); });
  await new Promise((r) => setTimeout(r, 400));
  // 聚焦第一个 summary
  await p.eval(() => {
    const s = document.querySelector('#d-body summary');
    s.setAttribute('tabindex', '0'); s.focus();
  });
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await new Promise((r) => setTimeout(r, 300));
  out.escOnSummary = await p.eval(() => ({
    detailHidden: document.getElementById('detail').hidden,
    hash: location.hash,
    activeEl: document.activeElement.tagName + '.' + (document.activeElement.className || ''),
  }));
  await p.close();
}

// (e) 真实的每行汉字数（用逐字宽度测，不用总高反推）
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 1400 });
  out.charsPerLine = await p.eval(() => {
    const mk = (fs, lh, w) => {
      const d = document.createElement('div');
      d.style.cssText = `position:absolute;visibility:hidden;width:${w}px;font-family:"Noto Sans SC",sans-serif;font-size:${fs}px;line-height:${lh};white-space:normal`;
      // 用真实文本：取详情面板里最长的一段
      document.body.appendChild(d);
      const ch = document.createElement('span');
      ch.textContent = '永'; d.appendChild(ch);
      const chW = ch.getBoundingClientRect().width;
      const sample = '暗底上的一道朱红楔形切进左上角，标题用窄体加宽字距压在楔口，正文落在暖白纸面上，边线与图版对齐，网格四栏十二行，留白靠外栏收口，按钮只有描边没有填充，图版只放在右侧三分之一，左侧留给标题和一句主张。';
      d.textContent = sample;
      const h = d.getBoundingClientRect().height;
      const lines = Math.round(h / (fs * lh));
      const cpl = Math.floor(w / chW * 100) / 100;
      d.remove();
      return { fs, lh, w, charW: +chW.toFixed(2), charsPerLineExact: cpl, measuredLines: lines, textLen: sample.length };
    };
    return { a: mk(16, 1.62, 355), b: mk(15, 1.5, 355), c: mk(16, 1.5, 367), d: mk(16, 1.45, 367) };
  });
  await p.close();
}

writeFileSync(join(HERE, '_p11_tail.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close();
