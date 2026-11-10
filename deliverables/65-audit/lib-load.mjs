// 共享：读 data.js / prompts.js / specs，供各探针复用。只读仓库，不写 prototypes。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const PROTO = join(ROOT, 'prototypes');
export const SPECS = join(PROTO, '_specs');
export const SEL = join(PROTO, '_selection');

export function loadSchemes() {
  const src = readFileSync(join(SEL, 'data.js'), 'utf8');
  const i = src.indexOf('window.SCHEMES =');
  const j = src.lastIndexOf(';');
  return JSON.parse(src.slice(i + 'window.SCHEMES ='.length, j));
}

export function loadPrompts() {
  const src = readFileSync(join(SEL, 'prompts.js'), 'utf8');
  const i = src.indexOf('window.STYLE_PROMPTS =');
  const j = src.lastIndexOf(';');
  return JSON.parse(src.slice(i + 'window.STYLE_PROMPTS ='.length, j));
}

export function specIds() {
  return readdirSync(SPECS).filter((f) => /^S\d{2}\.md$/.test(f)).map((f) => f.slice(0, 3)).sort();
}

export function readSpec(id) {
  return readFileSync(join(SPECS, id + '.md'), 'utf8');
}

// 与 collect-schemes.mjs 逐字一致的 dec()
export const dec = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
