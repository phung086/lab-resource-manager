/**
 * RAG Knowledge Base & Equipment Recommendation Service
 * Blueprint §31, §32, §33
 */

import { prisma } from "../db.js";
import { checkUserEligibility } from "./eligibilityService.js";
import { getResourceAvailability } from "./availabilityService.js";

/**
 * Ingest document content into chunks for RAG
 */
export async function ingestDocument({ resourceId, laboratoryId, title, sourceType, fileName, fileUrl, version, content }) {
  const doc = await prisma.knowledgeDocument.create({
    data: {
      resourceId,
      laboratoryId,
      title,
      sourceType: sourceType || "manual",
      fileName,
      fileUrl,
      version,
      isActive: true
    }
  });

  const chunks = chunkText(content, 500, 50);
  const createdChunks = await Promise.all(
    chunks.map((chunk, index) =>
      prisma.knowledgeChunk.create({
        data: {
          documentId: doc.id,
          chunkIndex: index,
          content: chunk,
          metadata: { page: Math.floor(index / 2) + 1, section: title }
        }
      })
    )
  );

  return { document: doc, chunkCount: createdChunks.length };
}

/**
 * Perform RAG Knowledge Base Search
 * Blueprint §31-32: Priority on relevant chunks with citations
 */
export async function searchKnowledgeBase({ query, resourceId, limit = 5 }) {
  const normalizedQuery = query.toLowerCase().trim();
  const keywords = normalizedQuery.split(/\s+/).filter((w) => w.length > 2);

  const where = {
    document: { isActive: true }
  };
  if (resourceId) {
    where.document.resourceId = resourceId;
  }

  const chunks = await prisma.knowledgeChunk.findMany({
    where,
    include: {
      document: {
        select: {
          id: true,
          title: true,
          sourceType: true,
          version: true,
          fileName: true,
          resource: { select: { id: true, name: true, code: true } }
        }
      }
    },
    take: 50
  });

  // Keyword match scoring
  const scored = chunks.map((chunk) => {
    const text = chunk.content.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score += 1;
    }
    return { ...chunk, score };
  });

  const results = scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => ({
      chunkId: c.id,
      content: c.content,
      citation: {
        documentTitle: c.document.title,
        sourceType: c.document.sourceType,
        version: c.document.version || "1.0",
        equipmentName: c.document.resource?.name,
        equipmentCode: c.document.resource?.code,
        page: c.metadata?.page || 1
      },
      matchScore: c.score
    }));

  return results;
}

/**
 * AI Equipment Recommender Engine
 * Blueprint §33: Capability Extraction -> Structured Filters -> Eligibility -> Availability -> Ranking
 */
export async function recommendEquipment({ user, intent, minRamGb, minVramGb, startAt, endAt, durationMinutes = 60 }) {
  const resources = await prisma.resource.findMany({
    where: {
      operationalStatus: { notIn: ["broken", "retired", "offline", "maintenance"] },
      bookingState: "bookable"
    },
    include: {
      capabilities: true,
      laboratory: { select: { id: true, name: true, code: true } }
    }
  });

  const recommendations = [];

  for (const res of resources) {
    let capabilityMatchScore = 0.5; // Base score
    const reasons = [];

    // Match intent keywords in name, type, description, specs
    const searchText = `${res.name} ${res.type} ${res.description || ""} ${JSON.stringify(res.specs || {})}`.toLowerCase();
    if (intent && searchText.includes(intent.toLowerCase())) {
      capabilityMatchScore += 0.3;
      reasons.push("Khớp với yêu cầu tìm kiếm về tính năng/loại thiết bị");
    }

    // Check RAM / VRAM requirements if specified
    if (res.specs) {
      if (minVramGb && res.specs.vram) {
        const vramNum = parseInt(res.specs.vram, 10);
        if (!isNaN(vramNum) && vramNum >= minVramGb) {
          capabilityMatchScore += 0.2;
          reasons.push(`Đáp ứng dung lượng VRAM (có ${res.specs.vram} >= ${minVramGb}GB)`);
        }
      }
    }

    // Eligibility check
    const eligibility = user ? await checkUserEligibility(user.id, res.id) : { eligible: true, warnings: [] };
    if (!eligibility.eligible) {
      continue; // Skip ineligible equipment
    }
    if (eligibility.warnings.length === 0) {
      reasons.push("Người dùng đủ chứng chỉ/điều kiện sử dụng");
    }

    // Availability check if time range provided
    let available = true;
    if (startAt && endAt) {
      const availResult = await getResourceAvailability(prisma, {
        resourceId: res.id,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        resource: res
      });
      available = availResult.available;
      if (available) {
        reasons.push("Thiết bị sẵn sàng trong khung giờ yêu cầu");
      } else {
        reasons.push("Thiết bị bận trong khung giờ yêu cầu (cần chọn giờ khác)");
        capabilityMatchScore -= 0.3;
      }
    }

    recommendations.push({
      resourceId: res.id,
      code: res.code,
      name: res.name,
      type: res.type,
      location: res.location,
      laboratoryName: res.laboratory?.name,
      matchScore: +Math.min(1.0, Math.max(0, capabilityMatchScore)).toFixed(2),
      available,
      reasons
    });
  }

  return recommendations
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);
}

function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}
