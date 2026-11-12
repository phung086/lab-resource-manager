import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { validateLocalDemoEnvironment } from './localDemoGuard.mjs';
import { graduationResources } from './graduationResourceCatalog.mjs';

validateLocalDemoEnvironment(process.env);
if (process.env.NODE_ENV === 'production') throw new Error('Demo only');
const db = new PrismaClient();
try {
  const result = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261109, 60)`;
    let created = 0;
    for (const {labCode, ...data} of graduationResources) {
      const existing = await tx.resource.findUnique({where:{code:data.code}});
      if (existing) {
        if (existing.specs?.catalogVersion !== 'GRADUATION_2026') throw new Error('Resource code collision');
        continue; // Never overwrite state, pricing, edits or bookings.
      }
      const lab = await tx.laboratory.findUnique({where:{code:labCode}});
      if (!lab?.isActive) throw new Error('Required local demo laboratory unavailable');
      const resource = await tx.resource.create({data:{id:randomUUID(), ...data, laboratoryId:lab.id, location:lab.name, ownerTeam:'LOCAL DEMO', maxBookingMinutes:480}});
      await tx.resourcePricingRule.create({data:{id:randomUUID(),resourceId:resource.id,purposeCode:'STUDY',label:'Thực hành — giá demo',hourlyRateVnd:10000}});
      created++;
    }
    return {created, preserved:graduationResources.length-created, catalogTotal:graduationResources.length};
  }, {timeout:30000});
  console.log(JSON.stringify(result));
} finally { await db.$disconnect(); }
