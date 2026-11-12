// Called privately by monitorLocalComputer: credential goes to its pipe, never terminal/logs.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { validateLocalDemoEnvironment } from './localDemoGuard.mjs';
import { createTelemetrySource, rotateTelemetrySourceCredential } from '../src/services/telemetryIdentityService.js';
validateLocalDemoEnvironment(process.env);
if (process.env.NODE_ENV === 'production') throw new Error('Local computer demo only');
let input = ''; for await (const chunk of process.stdin) { input += chunk; if (input.length > 4096) throw new Error('Input too large'); }
const hardware = z.object({ cpu: z.string().min(1).max(180), logicalCores: z.number().int().min(1).max(1024), memoryBytes: z.number().positive(), platform: z.literal('win32'), architecture: z.string().max(20) }).strict().parse(JSON.parse(input));
const db = new PrismaClient();
try {
  const result = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261109, 62)`;
    const lab = await tx.laboratory.findUnique({ where: { code: 'LOCAL-LAB-1' } });
    if (!lab) throw new Error('Local demo laboratory missing');
    let resource = await tx.resource.findUnique({ where: { code: 'DEMO-HOST-PC' } });
    if (resource && resource.specs?.provenance?.inventory !== 'HOST_MEASURED') throw new Error('Resource code collision');
    if (!resource) resource = await tx.resource.create({ data: { id: randomUUID(), code: 'DEMO-HOST-PC', name: 'Máy tính trình diễn · số đo trực tiếp', category: 'EQUIPMENT', subtype: 'OTHER', laboratoryId: lab.id, location: 'Local demonstration workstation', bookingState: 'non_bookable', specs: { hardware, provenance: { inventory: 'HOST_MEASURED', capturedAt: new Date().toISOString(), measurements: 'Node OS CPU interval and memory; Windows logical disks. No temperature/GPU sensor.' } } } });
    const existing = await tx.telemetrySource.findUnique({ where: { code: 'LOCAL-PC-AGENT' } });
    if (existing && (existing.kind !== 'EXTERNAL' || existing.resourceId !== resource.id || !existing.isActive)) throw new Error('Source collision/inactive');
    const created = existing ? await rotateTelemetrySourceCredential(tx, existing.id) : await createTelemetrySource(tx, { code: 'LOCAL-PC-AGENT', name: 'Windows PC · live OS readings', laboratoryId: resource.laboratoryId, resourceId: resource.id, kind: 'EXTERNAL', profile: 'COMPUTE' });
    return { credential: created.token, resourceId: resource.id };
  });
  process.stdout.write(JSON.stringify(result));
} finally { await db.$disconnect(); }
