import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const H = os.homedir();
const isDir = p => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };

// Known skill locations. Missing ones are skipped silently.
export function defaultRoots() {
  const roots = [
    { agent: 'Claude Code', group: 'personal', dir: path.join(H, '.claude/skills') },
    { agent: 'Codex', group: 'personal', dir: path.join(H, '.codex/skills') },
    { agent: 'Agents (shared)', group: 'personal', dir: path.join(H, '.agents/skills') },
    { agent: 'Cursor', group: 'personal', dir: path.join(H, '.cursor/skills') },
    { agent: 'Gemini CLI', group: 'personal', dir: path.join(H, '.gemini/skills') },
    { agent: 'OpenCode', group: 'personal', dir: path.join(H, '.config/opencode/skills') },
    { agent: 'Hermes', group: 'personal', dir: path.join(H, '.hermes/skills') },
    { agent: 'OpenClaw', group: 'personal', dir: path.join(H, '.openclaw/skills') },
  ];
  // Aside: ~/.aside/u/<n>/skills/{builtin,user}
  const asideU = path.join(H, '.aside/u');
  if (isDir(asideU)) for (const u of fs.readdirSync(asideU)) {
    for (const g of ['user', 'builtin']) roots.push({ agent: 'Aside', group: g, dir: path.join(asideU, u, 'skills', g) });
  }
  // Project-level skills in the current directory
  roots.push({ agent: 'Claude Code', group: 'project', dir: path.join(process.cwd(), '.claude/skills') });
  // Claude Code plugins: only the active installPath of each plugin
  const ipFile = path.join(H, '.claude/plugins/installed_plugins.json');
  try {
    const ip = JSON.parse(fs.readFileSync(ipFile, 'utf8')).plugins || {};
    for (const [plugin, arr] of Object.entries(ip)) {
      const inst = Array.isArray(arr) ? arr[arr.length - 1] : arr;
      if (inst?.installPath) roots.push({ agent: 'Claude Code', group: 'plugin:' + plugin.split('@')[0], dir: inst.installPath, plugin: plugin.split('@')[0] });
    }
  } catch {}
  // Extra roots: SKILL_ADVISOR_ROOTS="/path:Label,/other:Label2"
  for (const spec of (process.env.SKILL_ADVISOR_ROOTS || '').split(',').filter(Boolean)) roots.push(parseRoot(spec));
  return roots;
}

export function parseRoot(spec) {
  const i = spec.lastIndexOf(':');
  const dir = i > 0 ? spec.slice(0, i) : spec;
  const agent = i > 0 ? spec.slice(i + 1) : 'Custom';
  return { agent, group: 'custom', dir: dir.replace(/^~/, H) };
}

// Find SKILL.md files under a root, skipping caches and vendored copies.
const HIDDEN_SKIP = /^\.(archive|archived|trash|disabled|backup|bak|cache|old|curator_backups)$/i;
const SKIP = new Set(['node_modules', '.git', '.trash', 'dist', 'build', '__pycache__']);
export function findSkillFiles(root, maxDepth = 6) {
  const out = [];
  const walk = (d, depth) => {
    if (depth > maxDepth) return;
    let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (SKIP.has(e.name) || e.name.startsWith('temp_git_') || HIDDEN_SKIP.test(e.name)) continue; // archived/disabled copies
      const p = path.join(d, e.name);
      if (e.name === 'SKILL.md') { out.push(p); continue; }
      if ((e.isDirectory() || e.isSymbolicLink()) && isDir(p)) walk(p, depth + 1);
    }
  };
  walk(root, 0);
  return out.filter(f => !/\/cli\/assets\/|\/templates?\/SKILL\.md$/.test(f));
}
