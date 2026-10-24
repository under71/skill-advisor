import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const home = path.join(root, 'test/fixtures/home');
const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'sa-'));
const run = (...args) => JSON.parse(execFileSync('node', [path.join(root, 'bin/skill-advisor.mjs'), ...args, '--json'], {
  env: { ...process.env, HOME: home, SKILL_ADVISOR_HOME: cfg }, cwd: cfg, encoding: 'utf8' }));

test('scan finds skills across agents', () => {
  const r = run('scan');
  assert.equal(r.count, 6);
  assert.deepEqual([...new Set(r.roots.map(x => x.agent))].sort(), ['Claude Code', 'Codex', 'Hermes']);
});

test('find ranks Korean queries with particles', () => {
  const r = run('find', '주간', '보고서를', '만들어');
  assert.match(r.results[0].invocable, /report-(writer|maker)/);
});

test('find ranks English queries and merges identical copies', () => {
  const r = run('find', 'write tests first');
  assert.equal(r.results[0].invocable, 'tdd');
  assert.equal(r.results[0].alsoIn.length, 1);
});

test('explain extracts trigger phrases', () => {
  const r = run('explain', 'pdf-tools');
  assert.ok(r.triggers.includes('merge PDFs'));
  assert.ok(r.triggers.includes('PDF 합치기'));
});

test('doctor flags copies, overlap and vague descriptions', () => {
  const codes = run('doctor').map(f => f.code);
  assert.ok(codes.includes('copies'));
  assert.ok(codes.includes('short-description'));
  const r = run('doctor');
  assert.ok(!r.some(f => f.code === 'overlap' && f.skills.some(s => s.invocable === 'tdd')));
});
