import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { Prisma } from "@prisma/client";

const schemaPath = new URL("../prisma/schema.prisma", import.meta.url);
const generatedPath = new URL("../node_modules/.prisma/client/schema.prisma", import.meta.url);
const outputPath = new URL("../../docs/DB-erd/core-erd.md", import.meta.url);
const schema = readFileSync(schemaPath, "utf8").replace(/\r\n/g, "\n");
// Preserve quoted values while ignoring Prisma formatter whitespace and comments.
const tokens = text => (text.match(/"(?:\\.|[^"\\])*"|\/\/[^\n]*|[^\s]/g) || []).filter(token => !token.startsWith("//")).join("");
assert.equal(tokens(readFileSync(generatedPath, "utf8")), tokens(schema), "Run npm run db:generate before generating ERD from a changed schema");
const coreNames = ["Campus", "Building", "Laboratory", "LabPolicy", "User", "UserLabAssignment", "Resource", "ResourceStatusHistory", "TrainingCourse", "TrainingRequirement", "UserCertification", "Booking", "MaintenanceWindow", "Incident", "UsageLog", "Notification", "TelemetrySource", "TelemetrySample", "MonitoringAlert", "SystemAuditEvent"];
const extensionNames = ["Resource", "User", "Booking", "MaintenanceWindow", "StockItem", "StockMovement", "TeachingGroup", "TeachingMembership", "TeachingActivity"];
const modelMap = new Map(Prisma.dmmf.datamodel.models.map(model => [model.name, model]));
const types = { String: "string", Int: "int", Boolean: "boolean", DateTime: "datetime", Float: "float", Decimal: "decimal", Json: "json" };
function diagram(names) {
  const lines = ["```mermaid", "erDiagram"];
  for (const name of names) {
    const model = modelMap.get(name);
    assert.ok(model, `Missing canonical model ${name}`);
    const primary = new Set(model.primaryKey?.fields || model.fields.filter(field => field.isId).map(field => field.name));
    const foreign = new Set(model.fields.flatMap(field => field.relationFromFields || []));
    lines.push(`    ${name} {`);
    for (const field of model.fields.filter(field => field.kind !== "object" && (primary.has(field.name) || foreign.has(field.name) || field.isUnique || ["role", "status", "category", "operationalStatus", "startAt", "endAt", "action", "detectedAt"].includes(field.name)))) {
      const keys = [primary.has(field.name) ? "PK" : "", foreign.has(field.name) ? "FK" : "", field.isUnique && !primary.has(field.name) ? "UK" : ""].filter(Boolean);
      lines.push(`        ${types[field.type] || field.type} ${field.name}${keys.length ? ` ${keys.join(",")}` : ""}`);
    }
    lines.push("    }");
  }
  for (const name of names) {
    const model = modelMap.get(name);
    const uniqueKeys = [
      ...model.fields.filter(field => field.isId || field.isUnique).map(field => [field.name]),
      ...model.uniqueFields,
      ...(model.primaryKey ? [model.primaryKey.fields] : [])
    ];
    for (const relation of model.fields.filter(field => field.relationFromFields?.length && names.includes(field.type))) {
      const unique = uniqueKeys.some(keys => keys.every(key => relation.relationFromFields.includes(key)));
      lines.push(`    ${relation.type} ${relation.isRequired ? "||" : "|o"}--${unique ? "o|" : "o{"} ${name} : "${relation.relationFromFields.join(", ")}"`);
    }
  }
  return [...lines, "```"].join("\n");
}
const hash = createHash("sha256").update(schema).digest("hex");
const output = `# Core laboratory data relationships

Generated from [canonical Prisma schema](../../backend/prisma/schema.prisma).
Schema SHA-256 after LF normalization: \`${hash}\`.
Run \`npm run docs:erd\` in \`backend/\`; CI verifies \`docs:erd:check\`.
This is a selected model projection, not a claim that only these tables exist.
Foreign keys and cardinalities come from the generated Prisma data model checked
against the source schema. The current schema contains ${modelMap.size} models.

## Required booking operations and persisted monitoring

${diagram(coreNames)}

The 20 models cover identity/lab scope, resource policy, training eligibility,
booking, handover history, maintenance, incident handling, notification and
configured telemetry. Resource operational state and scheduling availability
remain separate. \`UserLabAssignment\` has a composite key; missing assignments
grant staff no laboratory access. Nullable relations are shown as optional.

PostgreSQL's \`bookings_no_active_overlap\` exclusion constraint and resource row
locks protect active booking intervals \`[startAt, endAt)\`. Prisma cannot express
the exclusion constraint; see tracked migrations and the concurrency tests.
History/audit records describe persisted events, not proof of physical inspection.

## Approved stock and teaching workspace extension

${diagram(extensionNames)}

Stock movements record receipts, issues and admin adjustments. A maintenance-linked
issue must remain in the same laboratory. Teaching groups represent lecturer
supervision; academic endorsement does not grant resource approval or handover.
Payment, shipment, AI, camera and optimization tables are outside this diagram's
core projection. Their presence in the schema does not certify those integrations.
`;
if (process.argv.includes("--check")) {
  assert.equal(readFileSync(outputPath, "utf8").replace(/\r\n/g, "\n"), output, "ERD is stale; run npm run docs:erd");
  console.log("Canonical ERD projection: verified");
} else {
  writeFileSync(outputPath, output);
  console.log("Canonical ERD projection: generated 20 core models and the approved workspace extension");
}
