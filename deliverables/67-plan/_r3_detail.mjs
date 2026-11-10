// _r3_detail.mjs — 前提 2 复算：4.2–5.5 屏是「浪费」还是「内容量×行宽」的算术结果
// 额外测两件审计没测的：①每行几个字（中文可读性）②零成本定位（sticky 头里已有标题，能否零高度加字段名）
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const IDS = ['S01', 'S08', 'S14', 'S26', 'S29'];

const OPEN = `(id)=>{ location.hash=id; }`;

const MEASURE = () => {
  const d = document.getElementById('detail');
  const body = document.getElementById('d-body');
  const scrollH = d.scrollHeight, clientH = d.clientHeight;
  const fields = Array.from(body.querySelectorAll('.field'));
  const rows = fields.map((f) => {
    const dt = f.querySelector('dt'), dd = f.querySelector('dd');
    const b = f.getBoundingClientRect();
    const db = dd ? dd.getBoundingClientRect() : null;
    const ddCs = dd ? getComputedStyle(dd) : null;
    const lines = dd && ddCs ? Math.round(db.height / parseFloat(ddCs.lineHeight)) : null;
    return {
      name: dt ? dt.textContent.trim() : null,
      h: +b.height.toFixed(1), top: +b.top.toFixed(0),
      chars: dd ? dd.textContent.replace(/\s+/g, '').length : 0,
      ddW: db ? +db.width.toFixed(1) : null,
      ddH: db ? +db.height.toFixed(1) : null,
      fs: ddCs ? ddCs.fontSize : null, lh: ddCs ? ddCs.lineHeight : null,
      lines,
      cpl: lines ? +(dd.textContent.replace(/\s+/g, '').length / lines).toFixed(1) : null,
    };
  });
  const totalChars = rows.reduce((a, r) => a + r.chars, 0);
  const totalLines = rows.reduce((a, r) => a + (r.lines || 0), 0);
  const head = document.querySelector('.detail-head');
  const hb = head.getBoundingClientRect();
  const firstFieldTop = rows.length ? +document.querySelector('.field').getBoundingClientRect().top.toFixed(0) : null;
  return {
    scrollH, clientH, screens: +(scrollH / clientH).toFixed(2),
    fieldCount: fields.length, totalChars, totalLines,
    avgCpl: +(totalChars / totalLines).toFixed(1),
    rows, firstFieldTop,
    headH: +hb.height.toFixed(1),
    headText: head.textContent.replace(/\s+/g, ' ').trim().slice(0, 80),
    // 面板里有没有任何"字段导航"？
    navCount: body.querySelectorAll('nav, [class*=nav], [class*=anchor], [class*=toc]').length,
    detailsCount: body.querySelectorAll('details').length,
    bodyPad: getComputedStyle(body).padding,
  };
};

// 折叠 4 个长字段 + CTA 折起（R2 的前两步），不动字号
const FOLD4 = `()=>{
  var d=document.getElementById('d-body');
  var names=['布局与网格','可落地要点','关键视觉元素','动效与交互'];
  var fields=Array.from(d.querySelectorAll('.field'));
  var n=0;
  fields.forEach(function(f){
    var t=f.querySelector('dt');
    if(!t) return;
    if(names.indexOf(t.textContent.trim())<0) return;
    var dt=t;
    var sum=document.createElement('summary');
    sum.style.cssText='cursor:pointer;list-style-position:inside;padding:2px 0;min-height:24px';
    sum.textContent=dt.textContent.trim();
    var det=document.createElement('details');
    det.setAttribute('data-lab','1');
    dt.parentNode.replaceChild(det,dt);
    det.appendChild(sum);
    Array.from(f.childNodes).forEach(function(c){ if(c.nodeType===1||(c.nodeType===3&&c.textContent.trim())) det.appendChild(c); });
    f.innerHTML=''; f.appendChild(det); n++;
  });
  document.querySelectorAll('.prompt-cta input, .prompt-cta p').forEach(function(e){});
  return n;
}`;

// 排版收紧（保持 16px 字号）：行高 1.5、字段内距 8、dt 间距 2、正文左右 16→10
const TIGHT = `()=>{
  var s=document.createElement('style');s.setAttribute('data-lab','1');
  s.textContent='.field dd{line-height:1.5}.field{padding:8px 0}.field dt{margin-bottom:2px}'
    +'@media (max-width:620px){.detail-body{padding:12px 10px 60px}}';
  document.head.appendChild(s);return 1;
}`;

// 只折最长 2 个字段（最便宜的一档），不动字号、不动行高
const FOLD2 = `()=>{
  var d=document.getElementById('d-body');
  var fields=Array.from(d.querySelectorAll('.field'));
  var arr=fields.map(function(f){var dd=f.querySelector('dd');var b=dd.getBoundingClientRect();return {f:f,h:b.height};});
  arr.sort(function(a,b){return b.h-a.h;});
  arr.slice(0,2).forEach(function(o){
    var f=o.f; var dt=f.querySelector('dt');
    var sum=document.createElement('summary');
    sum.style.cssText='cursor:pointer;list-style-position:inside;padding:2px 0;min-height:24px';
    sum.textContent=dt.textContent.trim();
    var det=document.createElement('details');det.setAttribute('data-lab','1');
    dt.parentNode.replaceChild(det,dt);det.appendChild(sum);
    Array.from(f.childNodes).forEach(function(c){ if(c.nodeType===1||(c.nodeType===3&&c.textContent.trim())) det.appendChild(c); });
    f.innerHTML=''; f.appendChild(det);
  });
  return 2;
}`;

// 零高度定位实验：把「当前字段名」塞进本来就 sticky 的头（不新增任何高度）
const PROBE_WAYFIND = `()=>{
  var d=document.getElementById('detail');
  var head=d.querySelector('.detail-head');
  var fields=Array.from(d.querySelectorAll('.field'));
  var hits=[];
  for(var y=0;y<=Math.round(d.scrollHeight-d.clientHeight);y+=400){
    d.scrollTop=y;
    var top=null;
    for(var i=0;i<fields.length;i++){
      var b=fields[i].getBoundingClientRect();
      if(b.bottom>0){ top=fields[i].querySelector('dt').textContent.trim(); break; }
    }
    hits.push({y:y, fieldAtTop:top, headText:head.textContent.replace(/\\s+/g,' ').trim().slice(0,40)});
  }
  d.scrollTop=0;
  return hits;
}`;

const out = { at: new Date().toISOString(), cases: {} };
const br = await Browser.launch({ width: 1440, height: 900 });
for (const id of IDS) {
  const rec = {};
  // 基线
  let p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE + '#' + id, { settleMs: 2000 });
  await p.eval('document.fonts.ready.then(()=>1)');
  rec.base = await p.eval(MEASURE);
  rec.wayfind = await p.eval(PROBE_WAYFIND);
  await p.close();
  // 只折 2 个
  p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE + '#' + id, { settleMs: 1800 });
  await p.eval('document.fonts.ready.then(()=>1)');
  await p.eval(FOLD2); await sleep(200);
  rec.fold2 = await p.eval(MEASURE);
  await p.close();
  // 折 4 + 排版收紧（R2 主体，保 16px）
  p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE + '#' + id, { settleMs: 1800 });
  await p.eval('document.fonts.ready.then(()=>1)');
  const nf = await p.eval(FOLD4); await p.eval(TIGHT); await sleep(250);
  rec.fold4tight = await p.eval(MEASURE);
  rec.fold4tight.folded = nf;
  await p.close();
  out.cases[id] = rec;
  console.log(id, 'base', rec.base.scrollH, rec.base.screens + '屏', 'chars', rec.base.totalChars, 'cpl', rec.base.avgCpl,
    '| fold2', rec.fold2.scrollH, '| fold4+tight', rec.fold4tight.scrollH, rec.fold4tight.screens + '屏');
}
await br.close();
writeFileSync(join(HERE, '_r3_detail.json'), JSON.stringify(out, null, 1), 'utf8');
