// 探针 15：把「接通去 AI 味审查点」这个修复**在浏览器里预演**，量它会让面板深多少。
// 全程只改内存 DOM，不写任何仓库文件。
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const REPO = 'D:\\Web\\style';
const OUT = join(REPO, 'deliverables/65-plan/_rt_out');
mkdirSync(OUT, { recursive: true });

function measure(arg) {
  const detail = document.getElementById('detail');
  const dRect = detail.getBoundingClientRect();
  return {
    contentH: detail.scrollHeight,
    clientH: detail.clientHeight,
    screens: +(detail.scrollHeight / detail.clientHeight).toFixed(2),
    fieldCount: document.querySelectorAll('#d-body .field').length,
    lastFieldBottom: (() => {
      const fs = document.querySelectorAll('#d-body .field');
      const el = fs[fs.length - 1];
      return el ? +(el.getBoundingClientRect().bottom - dRect.top + detail.scrollTop).toFixed(1) : null;
    })(),
  };
}

// 模拟 app.js 的 field() 输出：把 audit 作为一个新字段插到 risk 之前
function injectAudit() {
  const dl = document.querySelector('#d-body dl.fields');
  if (!dl) return { ok: false, why: 'no dl.fields' };
  const r = (window.SCHEMES || []).find((x) => x.id === window.__curId);
  if (!r || !r.audit) return { ok: false, why: 'no audit' };
  const d = document.createElement('div');
  d.className = 'field';
  d.id = 'injected-audit';
  d.innerHTML = '<dt>去 AI 味审查点</dt><dd></dd>';
  d.querySelector('dd').textContent = r.audit;   // 与 app.js 的 esc() 等价：textContent 不解析标签
  // 插到「反 AI 味风险与规避」之前（规格里字段 8 在字段 9 之前）
  const fields = [...dl.querySelectorAll('.field')];
  const riskField = fields.find((f) => (f.querySelector('dt') || {}).textContent === '反 AI 味风险与规避');
  if (riskField) dl.insertBefore(d, riskField);
  else dl.appendChild(d);
  return { ok: true, auditChars: r.audit.length };
}

const srv = await startServer(REPO);
const browser = await Browser.launch();
const rows = [];
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1200 });
  await page.eval('document.fonts.ready.then(()=>true)').catch(() => {});
  await sleep(500);

  for (const id of ['S13', 'S15', 'S29', 'S01', 'S30']) {
    await page.eval((sid) => {
      window.__curId = sid;
      document.querySelector('.row[data-id="' + sid + '"]').click();
      return true;
    }, id);
    await sleep(400);
    const before = await page.eval(measure);
    const info = await page.eval(injectAudit);
    await sleep(250);
    const after = await page.eval(measure);
    rows.push({ id, before, after, info, delta: +(after.contentH - before.contentH).toFixed(1), deltaScreens: +(after.screens - before.screens).toFixed(2) });
  }
  await page.close();
} finally {
  await browser.close();
  await srv.close();
}

writeFileSync(join(OUT, 'panel-inject-audit.json'), JSON.stringify(rows, null, 1), 'utf8');
console.log('=== 预演：把「去 AI 味审查点」接进详情面板后，面板深多少 ===');
console.log('id   注入前 contentH  注入后 contentH     +px    +屏   字段数   audit字数');
for (const r of rows) {
  console.log(`${r.id}  ${String(r.before.contentH).padStart(14)}  ${String(r.after.contentH).padStart(14)}  ${String(r.delta).padStart(6)}  ${String(r.deltaScreens).padStart(5)}  ${String(r.before.fieldCount).padStart(4)}→${String(r.after.fieldCount).padStart(3)}  ${r.info.auditChars || '-'}`);
}
const d = rows.map((r) => r.delta);
console.log('');
console.log('  +px 最小 ' + Math.min(...d) + '｜最大 ' + Math.max(...d) + '｜中位 ' + d.slice().sort((a, b) => a - b)[Math.floor(d.length / 2)]);
console.log('  注入后最大 contentH = ' + Math.max(...rows.map((r) => r.after.contentH)) + 'px = ' + Math.max(...rows.map((r) => r.after.screens)) + ' 屏');
