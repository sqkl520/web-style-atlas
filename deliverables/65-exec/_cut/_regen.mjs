import { spawnSync } from "node:child_process";
import fs from "node:fs";
const w = (out, p) => { fs.writeFileSync(p, out, "utf8"); console.log(p + " : " + Buffer.byteLength(out, "utf8") + " B"); };
const run = (args) => { const r = spawnSync(process.execPath, args, { encoding: "utf8", maxBuffer: 64*1024*1024 }); return (r.stdout||"") + (r.stderr||""); };
w(run(["prototypes/_prompts/build-prompts.mjs"]), "deliverables/65-exec/_cut/build-prompts.after.txt");
w(run(["deliverables/65-exec/_cut/compare.mjs"]), "deliverables/65-exec/_cut/compare.txt");
w(run(["deliverables/65-exec/_cut/regex-probe.mjs"]), "deliverables/65-exec/_cut/regex-probe.txt");
w(run(["deliverables/65-exec/_cut/regex-fragility.mjs"]), "deliverables/65-exec/_cut/regex-fragility.txt");
w(run(["deliverables/65-exec/_cut/scan-marker.mjs"]), "deliverables/65-exec/_cut/scan-marker.txt");
