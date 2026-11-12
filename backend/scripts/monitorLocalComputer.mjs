// Runs on the Windows host, not inside Docker. No third-party collector required.
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

if (process.platform !== 'win32') throw new Error('Run this collector on the Windows host, not in Docker');
const durationArg = process.argv.find(arg => arg.startsWith('--duration='));
const duration = Number(durationArg?.split('=')[1] || 300);
if (!Number.isInteger(duration) || duration < 10 || duration > 1800) throw new Error('Duration must be 10..1800 seconds');
const hardware = { cpu: os.cpus()[0]?.model || 'Unknown CPU', logicalCores: os.cpus().length, memoryBytes: os.totalmem(), platform: process.platform, architecture: os.arch() };
// The source secret exists only in process memory; a restart rotates it. Do not print result.
const privateResult = execFileSync('docker', ['exec', '-i', 'lrm-local-review-backend-1', 'node', 'scripts/provisionLocalComputer.mjs'], { input: JSON.stringify(hardware), encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
const { credential } = JSON.parse(privateResult);
const session = randomUUID(), started = Date.now();
let stopped = false, accepted = 0;
process.on('SIGINT', () => { stopped = true; });
process.on('SIGTERM', () => { stopped = true; });
const totals = () => os.cpus().reduce((sum, cpu) => ({ idle: sum.idle + cpu.times.idle, total: sum.total + Object.values(cpu.times).reduce((a,b) => a+b,0) }), { idle: 0, total: 0 });
async function send(reading) {
  const response = await fetch('http://127.0.0.1:8000/api/telemetry/samples', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-telemetry-source-token': credential }, body: JSON.stringify({ ...reading, timestamp: new Date().toISOString(), eventId: `${session}:${accepted}` }), signal: globalThis.AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Telemetry ingestion rejected (HTTP ${response.status})`);
  accepted++;
}
let previous = totals();
console.log('EXTERNAL · Windows OS readings · CPU/RAM/disk only · temperature and GPU unavailable.');
try {
  while (!stopped && Date.now() - started < duration * 1000) {
    await delay(5000); if (stopped) break;
    const current = totals(), elapsed = current.total - previous.total;
    const cpuPercent = elapsed > 0 ? Math.max(0, Math.min(100, 100 * (1 - (current.idle - previous.idle) / elapsed))) : undefined;
    previous = current;
    let diskPercent;
    try {
      const disks = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object Size,FreeSpace | ConvertTo-Json -Compress'], { encoding: 'utf8', timeout: 5000, windowsHide: true }));
      const all = Array.isArray(disks) ? disks : [disks];
      const size = all.reduce((sum,d) => sum + Number(d.Size || 0),0), free = all.reduce((sum,d) => sum + Number(d.FreeSpace || 0),0);
      if (size > 0) diskPercent = Math.max(0,Math.min(100,100*(1-free/size)));
    } catch { /* Unsupported disk read stays absent, never zero. */ }
    await send({ online: true, cpuPercent, ramPercent: 100 * (1 - os.freemem() / os.totalmem()), diskPercent });
    if (accepted % 12 === 0) console.log(`EXTERNAL · ${accepted} accepted samples`);
  }
  // This reports the collector disconnecting, not a claim that Windows powered off.
  await send({ online: false });
  console.log(JSON.stringify({ origin: 'EXTERNAL', accepted, status: 'STOPPED', note: 'Collector disconnected; physical resource state unchanged' }));
} catch { console.error('Collector stopped: ingestion unavailable. No successful sample claimed.'); process.exitCode = 1; }
