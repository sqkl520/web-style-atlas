import { Browser, openPage, settle, sleep } from './lib.mjs';
const br = await Browser.launch({width:1500,height:950});
for (const t of [{w:1440,h:900},{w:390,h:844}]) {
  const p = await openPage(br,{width:t.w,height:t.h,mobile:t.w<700,dsf:2});
  await p.goto('http://127.0.0.1:8901/prototypes/_selection/',{settleMs:1200});
  await settle(p,1500);
  const m1 = await p.eval(`(()=>{
    const mast=document.querySelector('header.mast');
    const sg=document.getElementById('self-gate');
    const fold=document.getElementById('mast-fold');
    const b=sg?sg.getBoundingClientRect():null;
    return { mastH:+mast.getBoundingClientRect().height.toFixed(1),
      foldH:+fold.getBoundingClientRect().height.toFixed(1), foldOpen:fold.open,
      selfGateExists:!!sg, selfGateH: b?+b.height.toFixed(1):null,
      selfGateText: sg?sg.textContent.trim().slice(0,40):null,
      firstTop:+(document.querySelector('#ledger .row').getBoundingClientRect().top+scrollY).toFixed(1),
      sh:document.documentElement.scrollHeight };
  })()`);
  // 隐藏 self-gate，看回到多少
  await p.eval(`(()=>{const s=document.getElementById('self-gate'); if(s) s.style.display='none'; return 1})()`);
  await sleep(500);
  const m2 = await p.eval(`(()=>{
    const mast=document.querySelector('header.mast');
    return { mastH:+mast.getBoundingClientRect().height.toFixed(1),
      firstTop:+(document.querySelector('#ledger .row').getBoundingClientRect().top+scrollY).toFixed(1),
      sh:document.documentElement.scrollHeight };
  })()`);
  console.log(`${t.w}x${t.h}: mast=${m1.mastH} (selfGate=${m1.selfGateH}, foldOpen=${m1.foldOpen}) firstTop=${m1.firstTop} sh=${m1.sh}`);
  console.log(`  隐藏 #self-gate 后: mast=${m2.mastH} (-${(m1.mastH-m2.mastH).toFixed(1)}) firstTop=${m2.firstTop} (-${(m1.firstTop-m2.firstTop).toFixed(1)}) sh=${m2.sh}`);
  await p.close();
}
await br.close(); process.exit(0);
