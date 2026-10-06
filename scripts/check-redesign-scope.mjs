import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const value = name => args[args.indexOf(name) + 1];
if (!args.includes('--task') || !args.includes('--base')) {
  console.error('Usage: node scripts/check-redesign-scope.mjs --task TASK --base REF');
  process.exit(2);
}
const taskId = value('--task');
const base = value('--base');
if (!base || base.startsWith('-')) throw new Error('Invalid base ref');
const manifest = JSON.parse(readFileSync(resolve(root, 'docs/ui-redesign/assignments.json'), 'utf8'));
const task = manifest.tasks[taskId];
if (!task) throw new Error(`Unknown task: ${taskId}`);
const git = (...items) => execFileSync('git', items, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const baseCommit = git('rev-parse', '--verify', `${base}^{commit}`).trim();
const allowed = new Set(task.allowed);
const committed = git('diff', '--name-only', '-z', `${baseCommit}...HEAD`).split('\0');
const unstaged = git('diff', '--name-only', '-z').split('\0');
const staged = git('diff', '--cached', '--name-only', '-z').split('\0');
const untracked = git('ls-files', '--others', '--exclude-standard', '-z').split('\0');
const changed = [...new Set([...committed, ...unstaged, ...staged, ...untracked].filter(Boolean))];
const denied = changed.filter(path => !allowed.has(path));
const cssIssues = [];
for (const path of changed.filter(path => allowed.has(path) && path.endsWith('.css'))) {
  let css;
  try { css = readFileSync(resolve(root, path), 'utf8'); } catch { continue; }
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/!important\b/.test(plain)) cssIssues.push(`${path}: !important requires coordinator review`);
  if (/(?:^|[},])\s*(?::root|html|body|\*)\s*[{,:.#[\s]/m.test(plain)) cssIssues.push(`${path}: possible global selector`);
  if (/--lab-[\w-]+\s*:/.test(plain)) cssIssues.push(`${path}: shared token redefinition`);
}
console.log(JSON.stringify({task: taskId, base: baseCommit, changed, denied, cssIssues}, null, 2));
if (denied.length || cssIssues.length) process.exit(1);
