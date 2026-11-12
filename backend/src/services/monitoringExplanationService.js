import { config } from '../config.js';
import { HttpError } from '../middleware/errors.js';
import { summarizeWithModel, modelInputFits } from '../assistant/assistantModel.js';
import { RequestGate, assertNotAborted } from '../assistant/assistantRuntime.js';
import { assertMonitoringActor } from './monitoringSimulationService.js';
import { serializeTelemetry, resolveMonitoringThresholds } from './telemetryService.js';
import { validSession } from './authTokens.js';

const gate = new RequestGate(2);
export async function monitoringEvidence(db, actor, resourceId) {
  return db.$transaction(async tx => {
    await assertMonitoringActor(tx, actor, resourceId);
    const resource = await tx.resource.findUnique({ where: { id: resourceId }, include: {
      laboratory: { include: { monitoringThreshold: true } }, monitoringThreshold: true,
      telemetrySources: { orderBy: { createdAt: 'desc' }, take: 1 },
      telemetrySamples: { orderBy: [{ sampledAt: 'desc' }, { id: 'desc' }], take: 12, include: { telemetrySource: true } },
      monitoringAlerts: { orderBy: { openedAt: 'desc' }, take: 8 }
    } });
    const view = serializeTelemetry(resource, resource.telemetrySamples[0]);
    return {
      generatedAt: new Date().toISOString(), resource: { id: resource.id, code: resource.code, name: resource.name, operationalStatus: resource.operationalStatus },
      monitoring: view.monitoring, thresholds: resolveMonitoringThresholds(resource),
      samples: resource.telemetrySamples.map(s => ({ id: s.id, sourceId: s.sourceId, origin: s.origin, simulationRunId: s.simulationRunId, sampledAt: s.sampledAt, online: s.online, temperatureC: s.temperatureC, humidityPercent: s.humidityPercent, cpuPercent: s.cpuPercent, ramPercent: s.ramPercent, diskPercent: s.diskPercent })),
      alerts: resource.monitoringAlerts.map(a => ({ id: a.id, sampleId: a.sampleId, origin: a.origin, ruleCode: a.ruleCode, severity: a.severity, status: a.status, observedValue: a.observedValue, thresholdSnapshot: a.thresholdSnapshot, openedAt: a.openedAt, resolvedAt: a.resolvedAt })),
      limits: ['Bounded latest 12 samples and 8 alerts; not full history.', 'SIMULATED is a teaching scenario, not hardware evidence.', 'Missing temperature or GPU readings are unknown.', 'Threshold breaches are observations, not a failure diagnosis.', 'No remaining-life or failure-probability prediction is validated.', 'Physical state and incident resolution require authorized human actions.']
    };
  });
}
export async function explainMonitoring(db, actor, { resourceId, question, locale }, { signal, sessionId, settings = config, modelCall = summarizeWithModel } = {}) {
  const release = gate.acquire(actor.id);
  try {
    const evidence = await monitoringEvidence(db, actor, resourceId);
    assertNotAborted(signal);
    if (!evidence.samples.length) return { mode: 'NO_DATA', evidence, answer: null };
    if (settings.mcpAssistantEnabled === false || !settings.openaiApiKey || !settings.openaiModel) return { mode: 'UNCONFIGURED', evidence, answer: null };
    const payload = { question, toolResults: [{ name: 'monitoring_evidence', data: evidence }] };
    if (!modelInputFits(payload)) throw new HttpError(413, 'Monitoring evidence exceeds model budget', undefined, 'ASSISTANT_INPUT_LIMIT');
    let answer;
    try { answer = await modelCall({ ...payload, locale, signal, settings }); }
    catch { assertNotAborted(signal); throw new HttpError(503, 'Monitoring AI is unavailable; measured evidence remains available', undefined, 'ASSISTANT_UNAVAILABLE'); }
    assertNotAborted(signal);
    // Recheck current account and scope before delivering a long-running result.
    await db.$transaction(async tx => {
      const { current } = await assertMonitoringActor(tx, actor, resourceId);
      if (sessionId && !validSession(await tx.authSession.findUnique({ where: { id: sessionId } }), current)) {
        throw new HttpError(401, 'Session expired or revoked', undefined, 'AUTH_EXPIRED');
      }
    });
    return { mode: 'AI', answer, evidence };
  } finally { release(); }
}
