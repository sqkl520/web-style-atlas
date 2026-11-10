import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
const browser = await Browser.launch(); const pg = await browser.newPage();
try {
  await pg.goto('https://sqkl520.github.io/web-style-atlas/prototypes/_selection/#S17', { settleMs: 4000 });
  const ready = await pg.eval(`new Promise(function(res){var t0=Date.now();(function p(){
    if(document.querySelectorAll('#ledger .row').length>0) return res(true);
    if(Date.now()-t0>25000) return res(false); setTimeout(p,150);})();})`);
  if (!ready) { console.log('未就绪'); process.exit(1); }
  const meta = JSON.parse(await pg.eval(`JSON.stringify({
    btns: [].map.call(document.querySelectorAll('.prompt-copy'), function(b){return b.textContent.trim()}),
    opts: [].map.call(document.querySelectorAll('#prompt-tool-select option'), function(o){return o.value})
  })`));
  console.log('线上按钮:', meta.btns.join(' / '));
  console.log('线上工具选项:', meta.opts.join(' '));
  const v0 = await pg.eval(`window.buildStylePrompt('S17',{tool:'v0'})||''`);
  const gen = await pg.eval(`window.buildStylePrompt('S17',{tool:'generic'})||''`);
  console.log('generic', gen.length, '字 / v0', v0.length, '字（应更长）');
  console.log('v0 首行:', v0.split('\n')[0]);
} finally { await browser.close(); }
