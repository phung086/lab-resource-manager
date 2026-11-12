import { randomUUID } from 'node:crypto';
import { HttpError } from '../middleware/errors.js';
import { lockCurrentAccount } from './accountAccess.js';
import { monitoringScopeWhere } from './monitoringAlertService.js';
import { createTelemetrySource, telemetrySourceInclude } from './telemetryIdentityService.js';
import { persistTelemetrySample } from './telemetryService.js';
import { recordSystemAuditEvent } from './systemAuditService.js';

export const SIMULATION_SCENARIOS = ['NORMAL', 'THERMAL_RISE', 'HIGH_LOAD', 'REPORTED_OFFLINE', 'RECOVERY'];
export const SIMULATION_STEPS = 60;
const MAX_ACTIVE_RUNS = 6;
const runSource = { select: { resourceId: true, resource: { select: { name: true } } } };
export function simulationEnabled(env = process.env) {
  try {
    const url = new URL(env.DATABASE_URL);
    return env.DEMO_MODE === 'true' && env.NODE_ENV !== 'production' && ['postgres:', 'postgresql:'].includes(url.protocol)
      && ['localhost', '127.0.0.1', 'postgres'].includes(url.hostname) && url.pathname === '/lab_resources_local_demo'
      && (!url.searchParams.has('schema') || url.searchParams.get('schema') === 'public');
  } catch { return false; }
}
export function simulationProfile(resource) {
  if (resource.specs?.environment !== 'LOCAL_DEMO') return null;
  if (resource.category === 'ROOM') return 'ROOM';
  return ['RASPBERRY_PI', 'GPU_SERVER'].includes(resource.subtype) ? 'COMPUTE' : null;
}
// Teaching trajectories, never calibrated hardware predictions. Offline has no readings.
export function simulationReading(profile, scenario, step) {
  if (!['ROOM', 'COMPUTE'].includes(profile) || !SIMULATION_SCENARIOS.includes(scenario) || !Number.isInteger(step) || step < 0 || step >= SIMULATION_STEPS || (profile === 'ROOM' && scenario === 'HIGH_LOAD')) throw new RangeError('Invalid simulation scenario');
  const wave = Math.sin(step * 0.7), room = profile === 'ROOM';
  let phase = 'NORMAL';
  if (scenario === 'THERMAL_RISE') phase = step < 12 ? 'NORMAL' : step < 24 ? 'LOAD' : step < 36 ? 'OVERHEAT' : step < 42 ? 'OFFLINE' : 'RECOVERY';
  if (scenario === 'HIGH_LOAD') phase = step < 12 ? 'NORMAL' : step < 42 ? 'LOAD' : 'RECOVERY';
  if (scenario === 'REPORTED_OFFLINE') phase = step < 12 ? 'NORMAL' : step < 42 ? 'OFFLINE' : 'RECOVERY';
  if (scenario === 'RECOVERY') phase = step < 12 ? 'OVERHEAT' : 'RECOVERY';
  if (phase === 'OFFLINE') return { phase, online: false };
  const high = phase === 'OVERHEAT', load = phase === 'LOAD';
  const temperatureC = room ? (high ? 36 : load ? 30 : 24) + wave * .3 : (high ? 92 : load ? 68 : 43) + wave;
  return { phase, online: true, temperatureC, ...(room ? { humidityPercent: 55 + wave * 2 } : { cpuPercent: high ? 99 : load ? 94 + wave : 22 + wave * 2, ramPercent: high ? 78 : load ? 65 : 35 }) };
}
function assertEnabled() { if (!simulationEnabled()) throw new HttpError(403, 'Local demonstration is disabled', undefined, 'SIMULATION_DISABLED'); }
export async function assertMonitoringActor(tx, actor, resourceId) {
  const current = await lockCurrentAccount(tx, actor.id, actor.authVersion);
  if (!['ADMIN', 'LAB_STAFF'].includes(current.role)) throw new HttpError(403, 'Operator required', undefined, 'FORBIDDEN');
  await tx.$queryRaw`SELECT id FROM resources WHERE id = ${resourceId} FOR SHARE`;
  const resource = await tx.resource.findFirst({ where: { id: resourceId, ...monitoringScopeWhere(current) } });
  if (!resource) throw new HttpError(404, 'Resource not found in your scope', undefined, 'NOT_FOUND');
  if (current.role === 'LAB_STAFF') {
    const rows = await tx.$queryRaw`SELECT "userId" FROM user_lab_assignments WHERE "userId" = ${current.id} AND "laboratoryId" = ${resource.laboratoryId} FOR SHARE`;
    if (!rows.length) throw new HttpError(403, 'Laboratory access changed', undefined, 'FORBIDDEN');
  }
  return { current, resource };
}
export function serializeSimulationRun(run) {
  return { id: run.id, resourceId: run.source?.resourceId, resourceName: run.source?.resource?.name, scenario: run.scenario, profile: run.profile, status: run.status, phase: run.phase, acceptedCount: run.acceptedCount, totalSteps: SIMULATION_STEPS, elapsedSeconds: run.elapsedSeconds, startedAt: run.startedAt, endedAt: run.endedAt, lastError: run.lastError };
}
export async function listSimulations(db, actor) {
  if (!simulationEnabled()) return { enabled: false, resources: [], runs: [] };
  const scope = monitoringScopeWhere(actor);
  const [resources, active, recent] = await Promise.all([
    db.resource.findMany({ where: { ...scope, laboratoryId: { not: null }, operationalStatus: { not: 'RETIRED' }, specs: { path: ['environment'], equals: 'LOCAL_DEMO' }, OR: [{ category: 'ROOM' }, { subtype: { in: ['RASPBERRY_PI', 'GPU_SERVER'] } }] }, orderBy: { code: 'asc' }, take: 250 }),
    db.monitoringSimulationRun.findMany({ where: { source: scope, status: 'RUNNING' }, include: { source: runSource }, orderBy: { startedAt: 'desc' } }),
    db.monitoringSimulationRun.findMany({ where: { source: scope, status: { not: 'RUNNING' } }, include: { source: runSource }, orderBy: { startedAt: 'desc' }, take: 6 })
  ]);
  return { enabled: true, resources: resources.map(r => ({ id: r.id, code: r.code, name: r.name, profile: simulationProfile(r) })), runs: [...active, ...recent].map(serializeSimulationRun) };
}
export async function startSimulation(db, actor, { resourceId, scenario }) {
  assertEnabled();
  return db.$transaction(async tx => {
    const { current, resource } = await assertMonitoringActor(tx, actor, resourceId);
    const profile = simulationProfile(resource);
    if (!profile || !resource.laboratoryId || resource.operationalStatus === 'RETIRED' || !SIMULATION_SCENARIOS.includes(scenario) || (profile === 'ROOM' && scenario === 'HIGH_LOAD')) throw new HttpError(400, 'Resource does not support this scenario', undefined, 'VALIDATION_ERROR');
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261109, 61)`;
    if (await tx.monitoringSimulationRun.count({ where: { status: 'RUNNING' } }) >= MAX_ACTIVE_RUNS) throw new HttpError(409, 'Maximum six simultaneous demonstrations', undefined, 'SIMULATION_LIMIT');
    if (await tx.telemetrySource.findFirst({ where: { resourceId, kind: 'EXTERNAL' }, select: { id: true } })) throw new HttpError(409, 'A measured resource cannot use a simulated source', undefined, 'SIMULATION_SOURCE_INVALID');
    let source = await tx.telemetrySource.findFirst({ where: { resourceId, kind: 'SIMULATED' } });
    if (!source) ({ source } = await createTelemetrySource(tx, { code: `SIM-${resource.id}`, name: `Simulation · ${resource.code}`, laboratoryId: resource.laboratoryId, resourceId, kind: 'SIMULATED', profile }));
    if (!source.isActive || source.profile !== profile || source.laboratoryId !== resource.laboratoryId) throw new HttpError(409, 'Simulation source inactive or incompatible', undefined, 'SIMULATION_SOURCE_INVALID');
    if (await tx.monitoringSimulationRun.findUnique({ where: { activeSourceId: source.id } })) throw new HttpError(409, 'A simulation is already running', undefined, 'SIMULATION_RUNNING');
    const run = await tx.monitoringSimulationRun.create({ data: { id: randomUUID(), sourceId: source.id, activeSourceId: source.id, startedById: current.id, scenario, profile, configuration: { origin: 'SIMULATED', runner: 'WORKSPACE', steps: SIMULATION_STEPS, model: 'Uncalibrated teaching trajectory' } } });
    await recordSystemAuditEvent(tx, { actor: current, action: 'MONITORING_SIMULATION_STARTED', targetType: 'MONITORING', targetId: run.id, resourceId, labId: resource.laboratoryId, afterState: { scenario, profile, origin: 'SIMULATED' } });
    return serializeSimulationRun({ ...run, source: { resourceId, resource: { name: resource.name } } });
  });
}
export async function stopSimulation(db, actor, id) {
  assertEnabled();
  return db.$transaction(async tx => {
    const run = await tx.monitoringSimulationRun.findUnique({ where: { id }, include: { source: true } });
    if (!run) throw new HttpError(404, 'Run not found', undefined, 'NOT_FOUND');
    const { current, resource } = await assertMonitoringActor(tx, actor, run.source.resourceId);
    await tx.$queryRaw`SELECT id FROM monitoring_simulation_runs WHERE id = ${id} FOR UPDATE`;
    const changed = await tx.monitoringSimulationRun.updateMany({ where: { id, status: 'RUNNING' }, data: { status: 'STOPPED', phase: 'STOPPED', activeSourceId: null, endedAt: new Date() } });
    if (changed.count) await recordSystemAuditEvent(tx, { actor: current, action: 'MONITORING_SIMULATION_STOPPED', targetType: 'MONITORING', targetId: id, resourceId: resource.id, labId: resource.laboratoryId });
    return serializeSimulationRun(await tx.monitoringSimulationRun.findUnique({ where: { id }, include: { source: runSource } }));
  });
}
export async function tickSimulation(db, id, now = new Date()) {
  assertEnabled();
  return db.$transaction(async tx => {
    // The run lock serializes workers and stop; each accepted sample commits with its counter.
    await tx.$queryRaw`SELECT id FROM monitoring_simulation_runs WHERE id = ${id} FOR UPDATE`;
    const run = await tx.monitoringSimulationRun.findUnique({ where: { id } });
    if (!run || run.status !== 'RUNNING' || run.configuration?.runner !== 'WORKSPACE') return;
    if (now - run.lastHeartbeatAt > 45000 || now - run.startedAt > 360000) {
      return tx.monitoringSimulationRun.update({ where: { id }, data: { status: 'INTERRUPTED', phase: 'INTERRUPTED', activeSourceId: null, endedAt: now, lastError: 'Simulation worker interrupted; start a new run.' } });
    }
    if (run.acceptedCount && now - run.lastHeartbeatAt < 5000) return;
    const source = await tx.telemetrySource.findUnique({ where: { id: run.sourceId }, include: telemetrySourceInclude() });
    const actor = await tx.user.findUnique({ where: { id: run.startedById } });
    const authorized = actor?.isActive && !actor.deletedAt && ['ADMIN', 'LAB_STAFF'].includes(actor.role) && await tx.resource.findFirst({ where: { id: source.resourceId, ...monitoringScopeWhere(actor) } });
    if (!authorized || !source.isActive || source.laboratoryId !== source.resource.laboratoryId || source.resource.operationalStatus === 'RETIRED') return tx.monitoringSimulationRun.update({ where: { id }, data: { status: 'STOPPED', phase: 'STOPPED', activeSourceId: null, endedAt: now, lastError: 'Source or operator access is no longer active.' } });
    const { phase, ...reading } = simulationReading(run.profile, run.scenario, run.acceptedCount);
    await persistTelemetrySample(tx, { source, now, localDemoRun: true, payload: { ...reading, timestamp: now, eventId: `${id}:${run.acceptedCount}`, simulationRunId: id } });
    const finished = run.acceptedCount + 1 === SIMULATION_STEPS;
    return tx.monitoringSimulationRun.update({ where: { id }, data: { phase: finished ? 'COMPLETED' : phase, acceptedCount: { increment: 1 }, elapsedSeconds: Math.floor((now - run.startedAt) / 1000), lastHeartbeatAt: now, ...(finished ? { status: 'COMPLETED', activeSourceId: null, endedAt: now } : {}) } });
  });
}
export function startSimulationScheduler(db) {
  if (!simulationEnabled()) return () => Promise.resolve();
  let pending = null;
  const tick = () => {
    if (pending) return;
    pending = (async () => {
      const runs = await db.monitoringSimulationRun.findMany({ where: { status: 'RUNNING', configuration: { path: ['runner'], equals: 'WORKSPACE' } }, take: MAX_ACTIVE_RUNS, orderBy: { startedAt: 'asc' } });
      for (const run of runs) {
        try { await tickSimulation(db, run.id); }
        catch { console.error('Monitoring simulation sample failed. The worker will retry on the next tick.'); }
      }
    })().catch(() => { console.error('Monitoring simulation tick failed; no synthetic success emitted.'); }).finally(() => { pending = null; });
  };
  const timer = setInterval(tick, 1000); timer.unref();
  return () => { clearInterval(timer); return pending || Promise.resolve(); };
}
