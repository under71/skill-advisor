import fs from 'node:fs';
import path from 'node:path';

// Minimal YAML frontmatter reader for name/description (supports quoted, plain, | and > blocks).
export function parseSkill(file) {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/);
  const fm = m ? m[1] : null;
  const get = key => {
    if (!fm) return '';
    const lines = fm.split(/\r?\n/);
    const idx = lines.findIndex(l => new RegExp('^' + key + '\\s*:').test(l));
    if (idx < 0) return '';
    let v = lines[idx].replace(new RegExp('^' + key + '\\s*:\\s*'), '');
    if (/^[|>][-+]?\s*$/.test(v)) {
      const block = [];
      for (const l of lines.slice(idx + 1)) { if (/^\S/.test(l)) break; block.push(l.trim()); }
      v = block.join(v.startsWith('|') ? '\n' : ' ');
    } else if (/^["']/.test(v) && !/["']\s*$/.test(v.slice(1))) {
      // multi-line quoted scalar
      const block = [v];
      for (const l of lines.slice(idx + 1)) { block.push(l.trim()); if (/["']\s*$/.test(l)) break; }
      v = block.join(' ');
    }
    v = v.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    return v.replace(/\\"/g, '"').replace(/''/g, "'").trim();
  };
  return {
    name: get('name') || path.basename(path.dirname(file)),
    description: get('description'),
    hasFrontmatter: !!fm,
    path: file,
    bytes: Buffer.byteLength(text),
  };
}

// Trigger phrases: quoted examples inside the description ("...", '...', “...”, 「...」).
export function triggerPhrases(desc = '') {
  const re = /["“「『']([^"”」』']{2,40})["”」』']/g;
  const out = new Set(); let m;
  while ((m = re.exec(desc))) out.add(m[1].trim());
  return [...out];
}
