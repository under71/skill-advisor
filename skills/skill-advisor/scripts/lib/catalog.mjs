import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { defaultRoots, findSkillFiles } from './roots.mjs';
import { parseSkill } from './parse.mjs';

export const HOME_DIR = process.env.SKILL_ADVISOR_HOME || path.join(os.homedir(), '.skill-advisor');
export const CATALOG = path.join(HOME_DIR, 'catalog.json');

export function buildCatalog(roots = defaultRoots()) {
  const skills = [];
  const seen = new Set();
  const usedRoots = [];
  for (const r of roots) {
    const files = findSkillFiles(r.dir);
    if (!files.length) continue;
    usedRoots.push({ ...r, count: files.length });
    for (const f of files) {
      let real; try { real = fs.realpathSync(f); } catch { real = f; }
      const key = r.agent + '|' + real;
      if (seen.has(key)) continue; seen.add(key);
      const s = parseSkill(f);
      const invocable = r.plugin ? `${r.plugin}:${s.name}` : s.name;
      skills.push({ agent: r.agent, group: r.group, invocable, ...s, realPath: real });
    }
  }
  return { generatedAt: new Date().toISOString(), host: os.hostname(), roots: usedRoots, count: skills.length, skills };
}

export function saveCatalog(cat) {
  fs.mkdirSync(HOME_DIR, { recursive: true });
  fs.writeFileSync(CATALOG, JSON.stringify(cat, null, 1));
  fs.writeFileSync(path.join(HOME_DIR, 'catalog.md'), toMarkdown(cat));
}

export function loadCatalog({ maxAgeDays = 7, refresh = false } = {}) {
  try {
    if (!refresh) {
      const cat = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
      if ((Date.now() - Date.parse(cat.generatedAt)) / 864e5 <= maxAgeDays) return cat;
    }
  } catch {}
  const cat = buildCatalog(); saveCatalog(cat); return cat;
}

export function groupBy(skills) {
  const out = {};
  for (const s of skills) ((out[s.agent] ??= {})[s.group] ??= []).push(s);
  return out;
}

export function toMarkdown(cat) {
  let md = `# Installed skills catalog\n\nGenerated ${cat.generatedAt} on ${cat.host} - ${cat.count} skills\n\n`;
  for (const [agent, groups] of Object.entries(groupBy(cat.skills))) {
    md += `## ${agent} (${Object.values(groups).flat().length})\n\n`;
    for (const [g, arr] of Object.entries(groups)) {
      md += `### ${g} (${arr.length})\n\n| skill | when it is triggered (description) |\n|---|---|\n`;
      for (const s of arr.sort((a, b) => a.name.localeCompare(b.name)))
        md += `| \`${s.invocable}\` | ${(s.description || '(no description)').replace(/\|/g, '/').replace(/\s+/g, ' ').slice(0, 240)} |\n`;
      md += '\n';
    }
  }
  return md;
}
