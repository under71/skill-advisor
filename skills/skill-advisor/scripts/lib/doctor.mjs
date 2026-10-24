import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { similarity } from './search.mjs';

const dirSize = d => { let n = 0; const w = p => { let e; try { e = fs.readdirSync(p, { withFileTypes: true }); } catch { return; } for (const x of e) { const q = path.join(p, x.name); if (x.isDirectory()) w(q); else { try { n += fs.statSync(q).size; } catch {} } } }; w(d); return n; };

// Returns a list of findings: { level: 'warn'|'info', code, msg, skills? }
export function doctor(cat, { simThreshold = 0.55, ko = false } = {}) {
  const t = (k, e) => (ko ? k : e);
  const f = [];
  const byName = {};
  for (const s of cat.skills) (byName[s.name] ??= []).push(s);

  for (const s of cat.skills) {
    if (!s.hasFrontmatter) f.push({ level: 'warn', code: 'no-frontmatter', msg: t('YAML 머리말이 없어 에이전트가 고르지 못할 수 있음', 'no YAML frontmatter, agents may never pick it'), skills: [s] });
    else if (!s.description) f.push({ level: 'warn', code: 'no-description', msg: t('description이 비어 있어 자동으로 불리지 않음', 'empty description, it will not be auto-triggered'), skills: [s] });
    else if (s.description.length < 40) f.push({ level: 'warn', code: 'short-description', msg: t(`description이 ${s.description.length}자뿐이라 언제 쓸지 판단하기 어려움`, `description is only ${s.description.length} chars, too vague to trigger reliably`), skills: [s] });
    else if (s.description.length > 1024) f.push({ level: 'warn', code: 'long-description', msg: t(`description이 ${s.description.length}자(1024 초과)라 잘릴 수 있음`, `description is ${s.description.length} chars (>1024), it may be truncated`), skills: [s] });
  }
  for (const [name, arr] of Object.entries(byName)) {
    if (arr.length < 2) continue;
    const descs = new Set(arr.map(s => s.description));
    if (descs.size === 1) f.push({ level: 'info', code: 'copies', msg: t(`"${name}" 같은 내용으로 ${arr.length}곳에 설치됨 (${[...new Set(arr.map(s => s.agent))].join(', ')})`, `"${name}" is installed ${arr.length} times with the same description (${[...new Set(arr.map(s => s.agent))].join(', ')})`), skills: arr });
    else f.push({ level: 'warn', code: 'name-conflict', msg: t(`"${name}" ${arr.length}곳에 있는데 설명이 서로 다름 (버전이 갈라짐)`, `"${name}" exists ${arr.length} times with DIFFERENT descriptions, copies drifted apart`), skills: arr });
  }
  // Different names, near-identical descriptions inside the same agent: they compete for the same prompt.
  const byAgent = {};
  for (const s of cat.skills) (byAgent[s.agent] ??= []).push(s);
  for (const arr of Object.values(byAgent)) {
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
      const a = arr[i], b = arr[j];
      if (a.name === b.name || !a.description || !b.description) continue;
      const sim = similarity(a.description, b.description);
      if (sim >= simThreshold) f.push({ level: 'warn', code: 'overlap', msg: t(`"${a.invocable}" 와 "${b.invocable}" 설명이 ${Math.round(sim * 100)}% 비슷해 같은 요청을 두고 경쟁함 (${a.agent})`, `"${a.invocable}" and "${b.invocable}" have ${Math.round(sim * 100)}% similar descriptions, they compete for the same requests (${a.agent})`), skills: [a, b] });
    }
  }
  // Context budget: Claude Code drops long-tail skills when many are installed.
  for (const [agent, arr] of Object.entries(byAgent)) {
    const chars = arr.reduce((n, s) => n + (s.description || '').length, 0);
    if (arr.length > 50) f.push({ level: 'warn', code: 'too-many', msg: t(`${agent}: 스킬 ${arr.length}개 (설명 ${chars.toLocaleString()}자). 50개를 넘으면 일부가 모델의 스킬 목록에서 조용히 빠질 수 있음`, `${agent}: ${arr.length} skills (${chars.toLocaleString()} description chars). Past ~50, some may be silently left out of the model's skill list`) });
  }
  // Stale Claude Code plugin caches (old versions left on disk)
  const cache = path.join(os.homedir(), '.claude/plugins/cache');
  const active = new Set();
  try { for (const arr of Object.values(JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude/plugins/installed_plugins.json'), 'utf8')).plugins || {})) for (const i of [].concat(arr)) if (i.installPath) active.add(path.resolve(i.installPath)); } catch {}
  try {
    const subdirs = p => { try { return fs.readdirSync(p, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name); } catch { return []; } };
    for (const mk of subdirs(cache)) for (const pl of subdirs(path.join(cache, mk))) {
      const vers = fs.readdirSync(path.join(cache, mk, pl)).map(v => path.join(cache, mk, pl, v)).filter(v => { try { return fs.statSync(v).isDirectory(); } catch { return false; } });
      const stale = vers.filter(v => !active.has(path.resolve(v)));
      if (vers.length > 1 && stale.length) {
        const mb = stale.reduce((n, v) => n + dirSize(v), 0) / 1048576;
        f.push({ level: 'info', code: 'stale-cache', msg: t(`플러그인 ${pl}: 안 쓰는 예전 버전 ${stale.length}개가 남아 있음 (${mb.toFixed(1)} MB)`, `plugin ${pl}: ${stale.length} old cached version(s) on disk (${mb.toFixed(1)} MB), not loaded`) });
      }
    }
  } catch {}
  return f;
}
