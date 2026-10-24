// Lightweight bilingual (Korean/English) ranking. No dependencies, no network.
const HANGUL = /[\uac00-\ud7a3]/;
const SYN = [
  ['보고서', 'report'], ['문서', 'document doc docx'], ['워드', 'docx word'], ['엑셀', 'xlsx excel spreadsheet'],
  ['스프레드시트', 'spreadsheet sheets xlsx'], ['발표', 'pptx slides presentation'], ['슬라이드', 'slides pptx'],
  ['디자인', 'design ui'], ['화면', 'ui screen frontend'], ['테스트', 'test testing tdd'], ['디버깅', 'debug debugging'],
  ['버그', 'bug debug'], ['배포', 'deploy deployment'], ['검색', 'search find'], ['이미지', 'image picture'],
  ['그림', 'image drawing art'], ['보안', 'security'], ['취약점', 'vulnerability security'], ['메일', 'email gmail mail'],
  ['깃허브', 'github git'], ['코드리뷰', 'code review'], ['리뷰', 'review'], ['계획', 'plan planning'],
  ['요약', 'summary summarize'], ['번역', 'translate translation'], ['영상', 'video youtube'], ['유튜브', 'youtube video'],
  ['비밀번호', 'password'], ['일정', 'calendar schedule'], ['캘린더', 'calendar'], ['노션', 'notion'], ['슬랙', 'slack'],
  ['파일', 'file'], ['로그인', 'login auth'], ['인증', 'auth certification'], ['데이터', 'data'], ['다이어그램', 'diagram'],
  ['차트', 'chart'], ['웹', 'web'], ['앱', 'app'], ['스킬', 'skill'], ['작성', 'write create draft'], ['만들', 'create build make'],
];
const synMap = new Map();
for (const [ko, en] of SYN) {
  synMap.set(ko, en.split(' '));
  for (const e of en.split(' ')) synMap.set(e, [...(synMap.get(e) || []), ko]);
}

export function tokenize(s = '') {
  return s.toLowerCase().normalize('NFC').split(/[^\p{L}\p{N}+#.-]+/u).map(t => t.replace(/^[.-]+|[.-]+$/g, '')).filter(t => t.length >= 2);
}
// Tiny English stemmer: tests->test, writing->writ, deployed->deploy
export const stem = t => (HANGUL.test(t) || t.length < 5) ? t : t.replace(/(ies)$/, 'y').replace(/(ing|ed|es|s)$/, '');
const bigrams = t => { const o = []; for (let i = 0; i < t.length - 1; i++) o.push(t.slice(i, i + 2)); return o; };

export function expandQuery(q) {
  const base = tokenize(q);
  const out = [];
  for (const t of base) {
    out.push({ t, w: 1, src: t });
    const st = stem(t); if (st !== t) out.push({ t: st, w: 0.8, src: t });
    for (const [k, vs] of synMap) if (t === k || (HANGUL.test(k) && t.includes(k))) vs.forEach(v => out.push({ t: v, w: 0.6, src: t }));
  }
  return out;
}

export function rank(skills, query, { top = 10 } = {}) {
  const terms = expandQuery(query);
  if (!terms.length) return [];
  const docs = skills.map(s => ({ s, name: s.name.toLowerCase(), desc: (s.description || '').toLowerCase().normalize('NFC') }));
  const N = docs.length;
  const df = t => docs.filter(d => d.name.includes(t) || d.desc.includes(t)).length;
  const idf = new Map(terms.map(({ t }) => [t, Math.log(1 + N / (1 + df(t)))]));
  const scored = docs.map(d => {
    let score = 0; const hits = []; const covered = new Set();
    for (const { t, w, src } of terms) {
      const i = idf.get(t);
      let s = 0;
      if (d.name.includes(t)) s += 3;
      const c = d.desc.split(t).length - 1;
      if (c) s += 1 + Math.min(c - 1, 2) * 0.5;
      // Korean partial match via bigrams (handles particles like 보고서를, 보고서는)
      if (!s && HANGUL.test(t) && t.length >= 3) {
        const bg = bigrams(t); const hit = bg.filter(b => d.desc.includes(b) || d.name.includes(b)).length;
        if (hit / bg.length >= 0.6) s += 0.7 * (hit / bg.length);
      }
      if (s) { score += s * w * i; hits.push(t); covered.add(src); }
    }
    const nBase = new Set(terms.map(x => x.src)).size;
    score *= 0.4 + 0.6 * (covered.size / nBase); // reward skills matching more of the request
    return { ...d.s, score: +score.toFixed(2), hits: [...new Set(hits)] };
  }).filter(x => x.score > 0);
  scored.sort((a, b) => b.score - a.score);
  // Collapse identical copies installed for several agents into one result.
  const merged = new Map();
  for (const x of scored) {
    const k = x.name + '\u0000' + (x.description || '');
    if (merged.has(k)) { const m = merged.get(k); m.alsoIn.push(`${x.agent}/${x.group}`); continue; }
    merged.set(k, { ...x, alsoIn: [] });
  }
  return [...merged.values()].slice(0, top);
}

export function similarity(a = '', b = '') {
  const A = new Set(tokenize(a)), B = new Set(tokenize(b));
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}
