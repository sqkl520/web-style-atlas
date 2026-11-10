// S08 垂直堆叠实测：用 Chrome 无头量 .plate 的计算样式，跨宽度扫描。
// 证据文件 s08-stack-probe.html 与本脚本同目录。
// 用法: node s08-stack-probe.mjs
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
const here=dirname(fileURLToPath(import.meta.url));
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
// 把探针页写成绝对 file:// URL
const page='file:///'+join(here,'s08-stack-probe.html').replace(/\\/g,'/');
const widths=[500,624,684,744,868,1008,1024,1404,1424];
console.log('视口宽   position    transform   height   判定');
for(const w of widths){
  const dom=execFileSync(chrome,['--headless=new','--disable-gpu','--no-sandbox',
    `--window-size=${w},700`,'--virtual-time-budget=2000','--dump-dom',page],{encoding:'utf8'});
  const m=dom.match(/\{"innerWidth".*?\}(?=<\/pre>)/);
  if(!m){console.log(`${w}  测量失败`);continue;}
  const r=JSON.parse(m[0]);
  const stacked=(r.position!=='absolute'&&r.transform==='none');
  console.log(`${String(r.innerWidth).padEnd(8)}${r.position.padEnd(12)}${r.transform.padEnd(12)}${r.height.padEnd(9)}${stacked?'垂直堆叠':'等距横向'}`);
}
