#!/usr/bin/env node
import path from 'node:path';
import { buildCatalog, saveCatalog, loadCatalog, groupBy, HOME_DIR } from './lib/catalog.mjs';
import { rank, similarity } from './lib/search.mjs';
import { triggerPhrases } from './lib/parse.mjs';
import { doctor } from './lib/doctor.mjs';
import { parseRoot, defaultRoots } from './lib/roots.mjs';

const argv = process.argv.slice(2);
const flags = {}; const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) { const k = a.slice(2); const nx = argv[i + 1]; if (nx && !nx.startsWith('--') && !['json', 'refresh', 'all'].includes(k)) { flags[k] = nx; i++; } else flags[k] = true; }
  else pos.push(a);
}
const KO = (flags.lang || process.env.LANG || '').startsWith('ko');
const t = (ko, en) => (KO ? ko : en);
const cmd = pos.shift() || 'help';
const clip = (s, n) => { s = (s || '').replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const filt = skills => skills.filter(s => !flags.agent || s.agent.toLowerCase().includes(String(flags.agent).toLowerCase()));
const out = x => console.log(JSON.stringify(x, null, 2));
const getCat = () => loadCatalog({ refresh: !!flags.refresh });

if (cmd === 'scan') {
  const roots = defaultRoots();
  if (flags.root) roots.push(parseRoot(flags.root));
  const cat = buildCatalog(roots); saveCatalog(cat);
  if (flags.json) out({ count: cat.count, roots: cat.roots });
  else {
    console.log(t(`스킬 ${cat.count}개를 찾았습니다 → ${path.join(HOME_DIR, 'catalog.md')}`, `Found ${cat.count} skills → ${path.join(HOME_DIR, 'catalog.md')}`));
    for (const r of cat.roots) console.log(`  ${String(r.count).padStart(4)}  ${r.agent} / ${r.group}  ${r.dir}`);
  }
} else if (cmd === 'list') {
  const cat = getCat(); const skills = filt(cat.skills);
  if (flags.json) out(skills);
  else for (const [agent, groups] of Object.entries(groupBy(skills))) {
    console.log(`\n${agent} (${Object.values(groups).flat().length})`);
    for (const [g, arr] of Object.entries(groups)) { console.log(`  ${g} (${arr.length})`); for (const s of arr) console.log(`    - ${s.invocable}  ${clip(s.description, 90)}`); }
  }
} else if (cmd === 'find' || cmd === 'recommend') {
  const q = pos.join(' ');
  if (!q) { console.error(t('사용법: skill-advisor find "하고 싶은 작업"', 'usage: skill-advisor find "what you want to do"')); process.exit(1); }
  const cat = getCat();
  const res = rank(filt(cat.skills), q, { top: +(flags.top || 8) });
  if (flags.json) out({ query: q, results: res.map(({ agent, group, invocable, description, path, score, hits, alsoIn }) => ({ agent, group, invocable, description, path, score, hits, alsoIn })) });
  else if (!res.length) console.log(t('키워드가 맞는 스킬이 없습니다. 다른 표현으로 찾거나 `list`로 전체를 보세요.', 'No keyword match. Try other words or run `list`.'));
  else res.forEach((s, i) => {
    console.log(`${i + 1}. ${s.invocable}  [${[`${s.agent}/${s.group}`, ...s.alsoIn].join(', ')}]  score ${s.score}`);
    console.log(`   ${clip(s.description, 200)}`);
    const tp = triggerPhrases(s.description).slice(0, 3);
    if (tp.length) console.log(`   ${t('트리거 예', 'triggers')}: ${tp.map(x => `"${x}"`).join(', ')}`);
  });
} else if (cmd === 'explain') {
  const name = pos.join(' ');
  const cat = getCat();
  const hits = cat.skills.filter(s => s.name === name || s.invocable === name);
  if (!hits.length) { console.log(t(`"${name}" 스킬을 찾지 못했습니다.`, `Skill "${name}" not found.`)); process.exit(1); }
  const main = hits[0];
  const rivals = cat.skills.filter(s => s.name !== main.name && s.description).map(s => ({ s, sim: similarity(main.description, s.description) })).sort((a, b) => b.sim - a.sim).filter((r, i, arr) => arr.findIndex(o => o.s.name === r.s.name) === i).slice(0, 3);
  if (flags.json) { out({ skill: main, installedAt: hits.map(h => h.path), triggers: triggerPhrases(main.description), rivals: rivals.map(r => ({ invocable: r.s.invocable, agent: r.s.agent, similarity: +r.sim.toFixed(2) })) }); process.exit(0); }
  console.log(`${main.invocable}\n\n${main.description || t('(설명 없음)', '(no description)')}\n`);
  console.log(t('설치 위치:', 'Installed at:')); hits.forEach(h => console.log(`  [${h.agent}/${h.group}] ${h.path}`));
  const tp = triggerPhrases(main.description);
  console.log('\n' + t('언제 호출되나: 에이전트는 매 요청마다 위 description만 보고 고릅니다.', 'When it fires: the agent only reads the description above when choosing.'));
  if (tp.length) console.log(t('  이런 말을 하면 잘 불립니다: ', '  Phrases that trigger it: ') + tp.slice(0, 6).map(x => `"${x}"`).join(', '));
  console.log(t(`  확실히 쓰려면 이름을 직접 말하세요: "${main.invocable} 스킬로 해줘"`, `  To force it, name it: "use the ${main.invocable} skill"`));
  if (rivals.length) { console.log('\n' + t('헷갈릴 수 있는 스킬:', 'Similar skills that may compete:')); rivals.forEach(r => console.log(`  ${Math.round(r.sim * 100)}%  ${r.s.invocable} [${r.s.agent}]  ${clip(r.s.description, 80)}`)); }
} else if (cmd === 'doctor') {
  const cat = getCat();
  const fs_ = doctor({ ...cat, skills: filt(cat.skills) }, { ko: KO });
  if (flags.json) { out(fs_.map(x => ({ ...x, skills: x.skills?.map(s => ({ invocable: s.invocable, agent: s.agent, path: s.path })) }))); process.exit(0); }
  const order = ['name-conflict', 'overlap', 'too-many', 'no-frontmatter', 'no-description', 'short-description', 'long-description', 'copies', 'stale-cache'];
  const counts = {}; fs_.forEach(x => counts[x.code] = (counts[x.code] || 0) + 1);
  console.log(t(`스킬 ${cat.count}개 점검 결과`, `Checked ${cat.count} skills`));
  for (const c of order) {
    const items = fs_.filter(x => x.code === c); if (!items.length) continue;
    console.log(`\n[${items[0].level.toUpperCase()}] ${c} (${items.length})`);
    for (const x of items.slice(0, flags.all ? 1e9 : 8)) console.log(`  - ${x.msg}${x.skills?.length === 1 ? `  (${x.skills[0].invocable} @ ${x.skills[0].agent})` : ''}`);
    if (items.length > 8 && !flags.all) console.log(t(`  ... 외 ${items.length - 8}건 (--all)`, `  ... ${items.length - 8} more (--all)`));
  }
  if (!fs_.length) console.log(t('문제 없음', 'All good'));
} else {
  console.log(`skill-advisor - ${t('설치된 에이전트 스킬 목록·추천·진단', 'inventory, recommend and diagnose installed agent skills')}

  scan [--root <dir:Label>]     ${t('모든 위치를 다시 조사해 카탈로그 생성', 'rebuild the catalog from every known location')}
  list [--agent <name>]         ${t('에이전트별 설치 스킬 목록', 'list skills grouped by agent')}
  find "<task>" [--top N]       ${t('작업에 맞는 스킬 추천 (한국어/영어)', 'recommend skills for a task (Korean/English)')}
  explain <skill>               ${t('언제 호출되는지, 설치 위치, 경쟁 스킬', 'when it fires, where it lives, competing skills')}
  doctor [--all]                ${t('중복·충돌·설명 부족·구버전 캐시 진단', 'find duplicates, conflicts, vague descriptions, stale caches')}

  --json  --agent <name>  --refresh  --lang ko|en
  ${t('카탈로그 위치', 'catalog')}: ${HOME_DIR}`);
}
