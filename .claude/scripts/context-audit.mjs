#!/usr/bin/env node
// Read-only: counts instructions/configuration and optional usage metadata.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const userDir = path.join(os.homedir(), '.claude');
const args = process.argv.slice(2);
const dateIndex = args.indexOf('--date');
const day = dateIndex < 0
  ? new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)
  : args[dateIndex + 1];
const validDay = /^\d{4}-\d{2}-\d{2}$/.test(day ?? '')
  && !Number.isNaN(Date.parse(day))
  && new Date(day).toISOString().slice(0, 10) === day;
if (args.some((a, i) => !['--usage', '--date'].includes(a)
      && !(dateIndex >= 0 && i === dateIndex + 1))
    || (dateIndex >= 0 && !args.includes('--usage'))
    || !validDay) {
  console.error('Usage: node .claude/scripts/context-audit.mjs [--usage [--date YYYY-MM-DD]]');
  process.exit(1);
}

function readJson(file, fallback = {}) {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { throw new Error(`Invalid JSON configuration: ${file}`); }
}
function stats(file, scope) {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  return { file: path.relative(root, file).replaceAll('\\', '/'), scope,
    bytes: Buffer.byteLength(text), lines: text.split(/\r?\n/).length };
}
function normalize(file) { return path.resolve(file).replaceAll('\\', '/').toLowerCase(); }
function metadata(file) {
  const body = fs.readFileSync(file, 'utf8');
  const header = body.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const name = header.match(/^name:\s*(.+)$/m)?.[1]?.trim()
    ?? path.basename(path.dirname(file));
  return { name, manual: /^disable-model-invocation:\s*true\s*$/m.test(header),
    headerCharacters: header.length, bodyBytes: Buffer.byteLength(body) };
}

try {
  const settings = [readJson(path.join(userDir, 'settings.json')),
    readJson(path.join(root, '.claude/settings.json')),
    readJson(path.join(root, '.claude/settings.local.json'))];
  const merged = Object.assign({}, ...settings);
  const enabledPlugins = Object.assign({}, ...settings.map(s => s.enabledPlugins ?? {}));
  const skillOverrides = Object.assign({}, ...settings.map(s => s.skillOverrides ?? {}));
  const env = Object.assign({}, ...settings.map(s => s.env ?? {}), process.env);
  const globalConfig = readJson(path.join(os.homedir(), '.claude.json'));
  const project = Object.entries(globalConfig.projects ?? {})
    .find(([p]) => normalize(p) === normalize(root))?.[1] ?? {};
  const mcpNames = [...Object.keys(globalConfig.mcpServers ?? {}),
    ...Object.keys(project.mcpServers ?? {}),
    ...Object.keys(readJson(path.join(root, '.mcp.json')).mcpServers ?? {})];
  const installed = readJson(path.join(userDir, 'plugins/installed_plugins.json'));
  for (const [name, entries] of Object.entries(installed.plugins ?? {})) {
    if (enabledPlugins[name] !== true) continue;
    const entry = entries.find(e => e.scope === 'user'
      || (e.projectPath && normalize(e.projectPath) === normalize(root)));
    if (!entry?.installPath) continue;
    const config = readJson(path.join(entry.installPath, '.mcp.json'));
    mcpNames.push(...Object.keys(config.mcpServers ?? config));
  }
  const skills = new Map();
  for (const dir of [path.join(userDir, 'skills'), path.join(root, '.claude/skills')]) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = path.join(dir, entry.name, 'SKILL.md');
      if (fs.existsSync(file)) skills.set(entry.name, metadata(file));
    }
  }
  const instructions = [stats(path.join(userDir, 'CLAUDE.md'), 'user startup'),
    stats(path.join(root, 'CLAUDE.md'), 'project startup'),
    stats(path.join(root, 'AGENTS.md'), 'imported by root CLAUDE.md'),
    stats(path.join(root, 'frontend/AGENTS.md'), 'FE on demand'),
    stats(path.join(root, 'backend/AGENTS.md'), 'BE on demand')].filter(Boolean);
  const ruleDir = path.join(root, '.claude/rules');
  if (fs.existsSync(ruleDir)) for (const file of fs.readdirSync(ruleDir)) {
    if (!file.endsWith('.md')) continue;
    const p = path.join(ruleDir, file);
    const text = fs.readFileSync(p, 'utf8');
    instructions.push(stats(p, /^---\r?\n[\s\S]*?^paths:/m.test(text)
      ? 'path scoped' : 'unconditional startup'));
  }
  const report = { root, autoCompactWindow: merged.autoCompactWindow ?? null,
    gatewayConfigured: Boolean(env.ANTHROPIC_BASE_URL),
    toolSearchExplicitlyConfigured: env.ENABLE_TOOL_SEARCH != null,
    enabledPlugins: Object.keys(enabledPlugins).filter(n => enabledPlugins[n]),
    configuredMcpNames: mcpNames,
    duplicateMcpNames: [...new Set(mcpNames.filter((n, i) => mcpNames.indexOf(n) !== i))],
    instructions,
    skills: [...skills.values()].map(s => ({ ...s,
      visibility: skillOverrides[s.name] ?? (s.manual ? 'user-invocable-only' : 'on') })),
    limits: 'Static local inventory, not actual prompt tokens. /context verifies loaded memory/tools. CLI flags, process env and managed settings may override files. No credentials or transcript content are printed.' };

  if (args.includes('--usage')) {
    const commonDir = execFileSync('git', ['rev-parse', '--git-common-dir'],
      { cwd: root, encoding: 'utf8' }).trim();
    const canonicalRoot = path.dirname(path.resolve(root, commonDir));
    const projectKey = canonicalRoot.replaceAll('\\', '/').replace(/[^a-zA-Z0-9]/g, '-');
    const logDir = path.join(userDir, 'projects', projectKey);
    const messages = new Map();
    let malformedLines = 0, sessions = 0;
    if (fs.existsSync(logDir)) for (const file of fs.readdirSync(logDir)) {
      if (!file.endsWith('.jsonl')) continue;
      sessions++;
      const lines = readline.createInterface({
        input: fs.createReadStream(path.join(logDir, file)), crlfDelay: Infinity });
      for await (const line of lines) {
        if (!line) continue;
        let event;
        try { event = JSON.parse(line); } catch { malformedLines++; continue; }
        if (event.type !== 'assistant' || !event.message?.id
            || !event.message?.usage || !event.timestamp) continue;
        const timestamp = Date.parse(event.timestamp);
        if (!Number.isFinite(timestamp)) continue;
        if (new Date(timestamp + 7 * 3600000).toISOString().slice(0, 10) !== day) continue;
        const previous = messages.get(event.message.id);
        if (!previous || previous.timestamp <= timestamp)
          messages.set(event.message.id, { timestamp, usage: event.message.usage });
      }
    }
    const usage = { input_tokens: 0, cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0 };
    let peakRequestInput = 0, latestRequestInput = null, latestTimestamp = 0;
    for (const { timestamp, usage: u } of messages.values()) {
      let total = 0;
      for (const key of Object.keys(usage)) {
        const value = Number(u[key] ?? 0);
        if (!Number.isFinite(value) || value < 0) continue;
        usage[key] += value; total += value;
      }
      peakRequestInput = Math.max(peakRequestInput, total);
      if (timestamp >= latestTimestamp) { latestTimestamp = timestamp; latestRequestInput = total; }
    }
    const processedInput = Object.values(usage).reduce((sum, n) => sum + n, 0);
    report.usage = { day, timezone: 'Asia/Ho_Chi_Minh', sessions,
      uniqueAssistantMessages: messages.size, ...usage, processedInput,
      cacheReadShare: processedInput ? usage.cache_read_input_tokens / processedInput : null,
      peakRequestInput, latestRequestInput, malformedLines,
      limits: 'Top-level local transcripts only; excludes subagent folders and other projects. Last snapshot per message.id avoids content-block double counting. Output-token snapshots omitted because streaming can be partial. Gateway-reported usage is not an invoice or a guarantee of model identity.' };
  }
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
