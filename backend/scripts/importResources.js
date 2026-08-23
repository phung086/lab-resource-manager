import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

import { normalizeResourceCode, normalizeSpecs, normalizeText } from "../src/utils/dataContract.js";

const prisma = new PrismaClient();

const booleanFromCsv = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return undefined;
  if (["true", "1", "yes", "y", "co", "có"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "khong", "không"].includes(normalized)) return false;
  return value;
}, z.boolean());

const rowSchema = z.object({
  code: z.string().min(2).max(64),
  name: z.string().min(2).max(255),
  type: z.enum(["room", "gpu_server", "raspberry_pi", "uav", "camera", "kit", "material"]),
  location: z.string().min(2).max(255),
  status: z.enum(["available", "reserved", "in_use", "maintenance", "offline"]),
  ownerTeam: z.string().min(2).max(255),
  capacity: z.coerce.number().int().positive(),
  requiresApproval: booleanFromCsv,
  specs: z.string().optional()
});

function readInputPath() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    throw new Error("Usage: npm run import:resources -- path/to/resources.csv");
  }
  return path.resolve(process.cwd(), fileArg);
}

function parseSpecs(rawSpecs) {
  if (!rawSpecs?.trim()) return {};
  const specs = {};
  for (const rawSegment of rawSpecs.split(/[;\n]/)) {
    const segment = rawSegment.trim();
    if (!segment) continue;
    const separator = segment.includes("=") ? "=" : segment.includes(":") ? ":" : "";
    if (!separator) throw new Error(`Invalid specs value: ${rawSpecs}`);
    const [rawKey, ...rest] = segment.split(separator);
    const key = rawKey.trim();
    const value = rest.join(separator).trim();
    if (!key || !value) throw new Error(`Invalid specs value: ${rawSpecs}`);
    specs[key] = value;
  }
  return specs;
}

async function main() {
  const inputPath = readInputPath();
  const csv = fs.readFileSync(inputPath, "utf8");
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });

  let imported = 0;
  for (const [index, record] of records.entries()) {
    const row = rowSchema.parse(record);
    const resource = {
      code: normalizeResourceCode(row.code),
      name: normalizeText(row.name),
      type: row.type,
      location: normalizeText(row.location),
      status: row.status,
      ownerTeam: normalizeText(row.ownerTeam),
      capacity: row.capacity,
      requiresApproval: row.requiresApproval,
      specs: normalizeSpecs(parseSpecs(row.specs))
    };
    await prisma.resource.upsert({
      where: { code: resource.code },
      update: resource,
      create: resource
    });
    imported = index + 1;
  }

  console.log(`Imported ${imported} resources from ${inputPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
