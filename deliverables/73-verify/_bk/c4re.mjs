import { readFileSync } from "node:fs";
const RE=/\*{0,2}`?(S\d{2})`?(?:'s)?[^。.\n]{0,26}?(?:(?:(\d+)\s*(?:处|条|个)[^。.\n]{0,16}?`?(shadow|button-fx)`?)|(?:`?(shadow|button-fx)`?[^。.\n]{0,10}?\((\d+)\s*(?:occurrences?|instances?|处)\)))/g;
const cases = [
 ["contract L110", readFileSync("D:/Web/style/prototypes/_CONTRACT.md","utf8").split("\n")[109]],
 ["README-EN L425", readFileSync("D:/Web/style/README-EN.md","utf8").split("\n")[424]],
 ["constructed EN", "- `S21` has 5 occurrences of `button-fx` that are genuinely unresolved."],
 ["constructed CN-ok", "- `S21` 有 5 处 `button-fx` 属真未修。"],
 ["constructed EN-paren", "- `S13` `shadow` (17 occurrences) is genuinely unresolved."],
];
for(const [name,txt] of cases){
  const ms=[...txt.matchAll(RE)];
  console.log(`\n[${name}] matches=${ms.length}`);
  for(const m of ms){
    const win=txt.slice(Math.max(0,m.index-120), m.index+200);
    const open=/真未修|未修|未清|genuinely unresolved|no exemption|不在.*允许表/.test(win);
    console.log("   id=",m[1],"num=",(m[2]??m[5]),"rule=",(m[3]??m[4]),"isOpen=",open);
    console.log("   matched:", JSON.stringify(m[0].slice(0,60)));
  }
}
