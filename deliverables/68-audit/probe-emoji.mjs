// Confirm the one genuinely-rendered emoji: wizard.js:204 emits "⚠" into .wz-gate.
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

// 1. static: what does lint say about wizard.js alone?
const b = await Browser.launch({ width: 1440, height: 900 });
const res = {};
try {
  const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
  await p.goto('http://127.0.0.1:8100/prototypes/_selection/wizard.html', { settleMs: 1600 });
  await p.eval(() => { for (const q of document.querySelectorAll('.wz-q')) { const btn = q.querySelector('.wz-opts button'); if (btn) btn.click(); } });
  await sleep(1400);
  res.gate = await p.eval(() => {
    const els = [...document.querySelectorAll('.wz-gate')];
    const re = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    return {
      count: els.length,
      samples: els.slice(0, 3).map((e) => e.textContent.trim().slice(0, 70)),
      emojiFound: els.flatMap((e) => (e.textContent.match(re) || [])),
      firstCharCodes: els[0] ? [...els[0].firstChild.textContent.slice(0, 2)].map((c) => c.codePointAt(0).toString(16)) : [],
    };
  });
  // full-page emoji sweep in the rendered DOM
  res.pageEmoji = await p.eval(() => {
    const re = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const hits = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const m = n.textContent.match(re);
      if (m) hits.push({ chars: [...new Set(m)], text: n.textContent.trim().slice(0, 50), parent: n.parentElement?.className || n.parentElement?.tagName });
    }
    return hits;
  });
  mkdirSync('deliverables/68-audit/shots', { recursive: true });
  await p.eval(() => { const g = document.querySelector('.wz-gate'); if (g) g.scrollIntoView({ block: 'center' }); });
  await sleep(500);
  await p.screenshot({ path: join('deliverables/68-audit/shots', 'wizard-emoji-gate.png'), format: 'png' });
  await p.close();
} finally {
  writeFileSync('deliverables/68-audit/probe-emoji.json', JSON.stringify(res, null, 1), 'utf8');
  await b.close();
}
console.log(JSON.stringify(res, null, 1));
