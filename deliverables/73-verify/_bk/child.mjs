
import { readFileSync } from "node:fs";
const CON = "D:/Web/style/prototypes/_CONTRACT.md";
const md = readFileSync(CON, "utf8");
const i = md.indexOf("9.15");
const j = md.indexOf("9.16", i);
const sec = j > 0 ? md.slice(i, j) : md.slice(i);
const rows = [...sec.split(/\r?\n/)].filter(l => /^\|\s*`([\w-]+)`\s*\|/.test(l)).map(l => l.match(/^\|\s*`([\w-]+)`\s*\|/)[1]);
console.log(JSON.stringify({ mdLen: md.length, i, j, secLen: sec.length, rows }));
