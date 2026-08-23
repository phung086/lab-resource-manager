import OpenAI from "openai";

import { config } from "../config.js";
import { normalizeSearchQuery } from "../utils/dataContract.js";
import { assistantTools, runAssistantTool } from "./toolHandlers.js";

const LOCALES = {
  vi: {
    label: "Tiếng Việt",
    localeCode: "vi-VN",
    timeZone: "Asia/Ho_Chi_Minh",
    summary: "Tổng quan vận hành",
    resources: "Tài nguyên phù hợp",
    slots: "Lịch trống phù hợp",
    conflicts: "Kiểm tra lịch trùng",
    bookings: "Lịch sử dụng",
    notifications: "Thông báo",
    totalResources: "Tài nguyên",
    pendingBookings: "Lịch chờ duyệt",
    unreadNotifications: "Thông báo chưa đọc",
    alerts: "Cảnh báo",
    attention: "Cần chú ý",
    availableRequested: "đang trống trong khung giờ yêu cầu",
    rangeSeparator: "đến",
    noData: "Chưa có dữ liệu phù hợp.",
    askTime: "Bạn cần cung cấp mã tài nguyên, thời gian bắt đầu và kết thúc để kiểm tra lịch trùng chính xác.",
    modelUnavailable: "AI model chưa được cấu hình; hệ thống đang dùng bộ phân tích nghiệp vụ nội bộ.",
    suggestions: [
      "Tìm lịch trống cho máy chủ GPU trong 7 ngày tới",
      "Thiết bị nào đang cần chú ý?",
      "Tôi có thông báo chưa đọc nào không?",
      "Kiểm tra tài nguyên phù hợp cho huấn luyện AI",
      "Lịch sử dụng sắp tới của phòng lab"
    ]
  },
  en: {
    label: "English",
    localeCode: "en-US",
    timeZone: "Asia/Ho_Chi_Minh",
    summary: "Operational summary",
    resources: "Matching resources",
    slots: "Available slots",
    conflicts: "Conflict check",
    bookings: "Bookings",
    notifications: "Notifications",
    totalResources: "Resources",
    pendingBookings: "Pending bookings",
    unreadNotifications: "Unread notifications",
    alerts: "Alerts",
    attention: "Needs attention",
    availableRequested: "is available for the requested time",
    rangeSeparator: "to",
    noData: "No matching data was found.",
    askTime: "Provide the resource code, start time, and end time to check booking conflicts accurately.",
    modelUnavailable: "The AI model is not configured; the system is using the internal operations analyzer.",
    suggestions: [
      "Find free GPU server slots in the next 7 days",
      "Which devices need attention?",
      "Do I have unread notifications?",
      "Find a suitable resource for AI training",
      "Show upcoming lab bookings"
    ]
  }
};

const TYPE_KEYWORDS = [
  { type: "gpu_server", patterns: ["gpu", "máy chủ", "may chu", "server", "h100", "l40s"] },
  { type: "raspberry_pi", patterns: ["raspberry", "raspberry pi", "edge", "pi"] },
  { type: "uav", patterns: ["uav", "drone", "bay", "thiết bị bay", "thiet bi bay"] },
  { type: "camera", patterns: ["camera", "realsense", "cam"] },
  { type: "room", patterns: ["phòng", "phong", "room", "lab"] }
];

const QUERY_STOP_WORDS = new Set([
  "anh",
  "available",
  "booking",
  "can",
  "cau",
  "check",
  "cho",
  "chu",
  "chua",
  "co",
  "conflict",
  "con",
  "cua",
  "dat",
  "device",
  "do",
  "duoc",
  "find",
  "free",
  "giup",
  "hay",
  "hien",
  "hoi",
  "hom",
  "huan",
  "kiem",
  "lab",
  "lich",
  "manager",
  "monitor",
  "nao",
  "nay",
  "ngay",
  "please",
  "phu",
  "quan",
  "resource",
  "sap",
  "slot",
  "su",
  "summary",
  "tai",
  "the",
  "thiet",
  "thong",
  "tim",
  "toi",
  "trong",
  "training",
  "trung",
  "tu",
  "van",
  "voi",
  "which",
  "xin",
  "y"
]);

const LABELS = {
  vi: {
    statuses: {
      pending: "chờ duyệt",
      approved: "đã duyệt",
      rejected: "đã từ chối",
      cancelled: "đã hủy",
      checked_out: "đang sử dụng",
      completed: "đã hoàn tất",
      available: "sẵn sàng",
      reserved: "đã đặt",
      in_use: "đang sử dụng",
      maintenance: "bảo trì",
      offline: "mất kết nối"
    },
    resourceTypes: {
      room: "phòng lab",
      gpu_server: "máy chủ GPU",
      raspberry_pi: "Raspberry Pi",
      uav: "thiết bị bay",
      camera: "camera",
      kit: "bộ thiết bị",
      material: "vật tư"
    },
    operationalStates: {
      stable: "ổn định",
      warning: "cần theo dõi",
      critical: "cần xử lý",
      unknown: "chưa có telemetry"
    },
    severities: {
      info: "thông tin",
      success: "hoàn tất",
      warning: "cần chú ý",
      danger: "khẩn cấp"
    },
    notificationTitles: {
      accountCreated: "Tài khoản đã được tạo",
      bookingCreated: "Đã tạo yêu cầu sử dụng",
      newBookingRequest: "Có yêu cầu sử dụng mới",
      bookingApproved: "Lịch sử dụng đã được duyệt",
      bookingRejected: "Lịch sử dụng bị từ chối",
      resourceCheckedOut: "Tài nguyên đã được bàn giao",
      bookingReturned: "Đã xác nhận hoàn trả"
    },
    notificationMessages: {
      accountCreated: "Bạn có thể đăng nhập vào hệ thống quản lý phòng lab.",
      bookingCreated: "{resource}: {title}",
      newBookingRequest: "{user} muốn sử dụng {resource}",
      bookingApproved: "{resource}: {title}",
      bookingRejected: "{reason}",
      resourceCheckedOut: "{resource}",
      bookingReturned: "{resource}"
    }
  },
  en: {
    statuses: {
      pending: "pending",
      approved: "approved",
      rejected: "rejected",
      cancelled: "cancelled",
      checked_out: "checked out",
      completed: "completed",
      available: "available",
      reserved: "reserved",
      in_use: "in use",
      maintenance: "maintenance",
      offline: "offline"
    },
    resourceTypes: {
      room: "lab room",
      gpu_server: "GPU server",
      raspberry_pi: "Raspberry Pi",
      uav: "UAV",
      camera: "camera",
      kit: "equipment kit",
      material: "material"
    },
    operationalStates: {
      stable: "stable",
      warning: "watch",
      critical: "action needed",
      unknown: "no telemetry"
    },
    severities: {
      info: "info",
      success: "success",
      warning: "warning",
      danger: "urgent"
    },
    notificationTitles: {
      accountCreated: "Account created",
      bookingCreated: "Usage request created",
      newBookingRequest: "New usage request",
      bookingApproved: "Usage booking approved",
      bookingRejected: "Usage booking rejected",
      resourceCheckedOut: "Resource checked out",
      bookingReturned: "Return confirmed"
    },
    notificationMessages: {
      accountCreated: "You can sign in to the lab management system.",
      bookingCreated: "{resource}: {title}",
      newBookingRequest: "{user} wants to use {resource}",
      bookingApproved: "{resource}: {title}",
      bookingRejected: "{reason}",
      resourceCheckedOut: "{resource}",
      bookingReturned: "{resource}"
    }
  }
};

export function getAssistantSuggestions(locale = "vi") {
  return localeCopy(locale).suggestions;
}

export async function answerAssistantQuestion({ message, locale = "vi" }, context) {
  const copy = localeCopy(locale);
  const normalized = removeDiacritics(message.toLowerCase());

  if (isAccountQuestion(normalized)) {
    return buildAccountAnswer(context?.user, copy);
  }

  if (!isOperationalQuestion(message, normalized)) {
    return answerGeneralKnowledgeQuestion({ message, locale, copy });
  }

  const plan = planTools(message);
  const toolResults = [];

  for (const step of plan) {
    const result = await runAssistantTool(step.name, step.input, context);
    toolResults.push({ tool: step.name, input: step.input, result });
  }

  const localAnswer = buildLocalAnswer(message, toolResults, copy);
  const dataQuality = buildDataQuality(toolResults);

  if (config.openaiApiKey && config.openaiModel) {
    try {
      const answer = await synthesizeWithOpenAI({ message, locale, toolResults, fallback: localAnswer });
      return {
        answer,
        provider: "openai",
        toolsUsed: toolResults.map((item) => item.tool),
        toolResults,
        dataQuality,
        suggestions: getSuggestedActions(toolResults, copy)
      };
    } catch (error) {
      console.error("OpenAI assistant synthesis failed; falling back to local answer.", error);
    }
  }

  return {
    answer: localAnswer,
    provider: "local",
    toolsUsed: toolResults.map((item) => item.tool),
    toolResults,
    dataQuality,
    suggestions: getSuggestedActions(toolResults, copy)
  };
}

export function listAssistantTools() {
  const operationalTools = assistantTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    readOnly: tool.readOnly
  }));
  return [
    ...operationalTools,
    {
      name: "account_context",
      description: "Read the signed-in user's account and role context.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      readOnly: true
    },
    {
      name: "external_knowledge",
      description: "Search cited external knowledge for non-operational questions.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" }, source: { type: "string" } },
        required: ["query"],
        additionalProperties: false
      },
      readOnly: true
    }
  ];
}

export async function searchExternalKnowledge({ query, locale = "vi" }) {
  const result = await searchWikipedia(query, locale);
  return {
    query,
    source: "wikipedia",
    found: Boolean(result),
    result,
    retrievedAt: new Date().toISOString()
  };
}

function buildAccountAnswer(user, copy) {
  const result = {
    id: user?.id,
    email: user?.email,
    fullName: user?.fullName,
    role: user?.role,
    isActive: user?.isActive
  };
  const role = labelRole(user?.role, copy);
  const answer = copy.localeCode === "en-US"
    ? `You are signed in as ${user?.fullName || "-"} (${user?.email || "-"}). Your role is ${role}; this controls which resources, bookings, users, and operations you can view or update.`
    : `Bạn đang đăng nhập bằng tài khoản ${user?.fullName || "-"} (${user?.email || "-"}). Vai trò của bạn là ${role}; vai trò này quyết định phạm vi tài nguyên, lịch sử dụng, người dùng và thao tác vận hành bạn được phép xem hoặc cập nhật.`;

  return {
    answer,
    provider: "account",
    toolsUsed: ["account_context"],
    toolResults: [{ tool: "account_context", input: {}, result }],
    dataQuality: buildDataQuality([{ tool: "account_context", input: {}, result }]),
    suggestions: getSuggestedActions([], copy)
  };
}

async function answerGeneralKnowledgeQuestion({ message, locale, copy }) {
  const wikiResult = await searchWikipedia(message, locale);
  const toolResults = wikiResult ? [{ tool: "external_knowledge", input: { query: message, source: "wikipedia" }, result: wikiResult }] : [];
  let answer = wikiResult ? renderWikipediaAnswer(wikiResult, copy) : copy.localeCode === "en-US"
    ? "I could not find a reliable external knowledge source for that question. Try asking with a more specific name or topic."
    : "Mình chưa tìm được nguồn kiến thức ngoài đáng tin cậy cho câu hỏi đó. Bạn thử hỏi cụ thể hơn bằng tên người, tổ chức hoặc chủ đề nhé.";
  let provider = "external";

  if (config.openaiApiKey && config.openaiModel) {
    try {
      answer = await synthesizeGeneralWithOpenAI({ message, locale, wikiResult, fallback: answer });
      provider = "openai";
    } catch (error) {
      console.error("OpenAI general answer synthesis failed; using external source summary.", error);
    }
  }

  return {
    answer,
    provider,
    toolsUsed: wikiResult ? ["external_knowledge"] : [],
    toolResults,
    dataQuality: buildDataQuality(toolResults),
    suggestions: getSuggestedActions([], copy)
  };
}

function planTools(message = "") {
  const normalized = removeDiacritics(message.toLowerCase());
  const type = detectResourceType(normalized);
  const resourceCode = detectResourceCode(message);
  const durationMinutes = detectDurationMinutes(normalized);
  const dateRange = detectDateRange(message, normalized);
  const query = extractSearchQuery(message, normalized, { type, resourceCode });
  const wantsNotifications = hasAny(normalized, ["thong bao", "notification", "unread", "chua doc"]);
  const wantsFreeSlots = hasAny(normalized, ["lich trong", "trong", "free slot", "available slot", "slot", "con trong"]);
  const wantsConflicts = hasAny(normalized, ["trung", "conflict", "overlap", "kiem tra lich"]);
  const wantsBookings = hasAny(normalized, ["lich su dung", "booking", "dat lich", "sap toi"]);
  const wantsResources = hasAny(normalized, ["tai nguyen", "thiet bi", "resource", "gpu", "raspberry", "uav", "camera", "phong"]);
  const wantsSummary = hasAny(normalized, ["tong quan", "can chu y", "canh bao", "hieu suat", "monitor", "summary", "alert"]);
  const wantsRecommend = hasAny(normalized, ["goi y", "recommend", "phu hop", "can dung", "tot nhat"]);
  const wantsKnowledge = hasAny(normalized, ["huong dan", "manual", "sop", "quy dinh", "dieu kien"]);
  const wantsIncidents = hasAny(normalized, ["su co", "incident", "hong", "bao hong"]);

  if (wantsRecommend) {
    return [{ name: "recommend_equipment", input: { intent: query || message } }];
  }

  if (wantsKnowledge) {
    return [{ name: "search_knowledge_base", input: { query: message } }];
  }

  if (wantsIncidents) {
    return [{ name: "get_incidents", input: { limit: 10 } }];
  }

  if (wantsNotifications) {
    return [{ name: "search_notifications", input: { unreadOnly: hasAny(normalized, ["chua doc", "unread"]), limit: 12 } }];
  }

  if (wantsConflicts) {
    const dates = detectIsoDates(message);
    if (resourceCode && dates.length >= 2) {
      return [{ name: "check_booking_conflicts", input: { resourceCode, startAt: dates[0], endAt: dates[1] } }];
    }
    return [
      { name: "find_available_slots", input: { resourceCode, resourceType: type, from: dateRange.from, to: dateRange.to, durationMinutes, limit: 5 } }
    ];
  }

  if (wantsFreeSlots) {
    return [
      { name: "find_available_slots", input: { resourceCode, resourceType: type, from: dateRange.from, to: dateRange.to, durationMinutes, limit: 8 } }
    ];
  }

  if (wantsBookings) {
    return [{ name: "search_bookings", input: { query, from: dateRange.from, to: dateRange.to, limit: 12 } }];
  }

  if (wantsSummary) {
    return [{ name: "get_operational_summary", input: {} }];
  }

  if (wantsResources) {
    return [{ name: "search_resources", input: { query, type, limit: 10 } }];
  }

  return [
    { name: "get_operational_summary", input: {} },
    { name: "search_resources", input: { query, type, limit: 6 } }
  ];
}

function buildLocalAnswer(message, toolResults, copy) {
  if (!toolResults.length) return copy.noData;

  const sections = [];
  for (const item of toolResults) {
    if (item.tool === "get_operational_summary") {
      sections.push(renderSummary(item.result, copy));
    }
    if (item.tool === "search_resources") {
      sections.push(renderResources(item.result, copy));
    }
    if (item.tool === "find_available_slots") {
      sections.push(renderSlots(item.result, copy));
    }
    if (item.tool === "check_booking_conflicts") {
      sections.push(renderConflicts(item.result, copy));
    }
    if (item.tool === "search_bookings") {
      sections.push(renderBookings(item.result, copy));
    }
    if (item.tool === "search_notifications") {
      sections.push(renderNotifications(item.result, copy));
    }
    if (item.tool === "recommend_equipment") {
      sections.push(renderRecommendations(item.result, copy));
    }
    if (item.tool === "search_knowledge_base") {
      sections.push(renderKnowledgeBase(item.result, copy));
    }
    if (item.tool === "get_incidents") {
      sections.push(renderIncidents(item.result, copy));
    }
  }

  if (!sections.length) return `${copy.noData}\n\n${copy.askTime}`;
  return sections.join("\n\n");
}

function renderRecommendations(result, copy) {
  if (!result.recommendations?.length) return `Gợi ý thiết bị:\n${copy.noData}`;
  return [
    "🤖 **Gợi ý thiết bị phù hợp:**",
    ...result.recommendations.map((r, i) =>
      `${i + 1}. **${r.name}** (${r.code}) - Độ phù hợp: ${Math.round(r.matchScore * 100)}%\n   Vị trí: ${r.location || "Lab"}\n   Lý do: ${r.reasons.join("; ")}`
    )
  ].join("\n");
}

function renderKnowledgeBase(result, copy) {
  if (!result.results?.length) return `Tài liệu hướng dẫn:\n${copy.noData}`;
  return [
    "📚 **Kết quả tra cứu tài liệu & SOP:**",
    ...result.results.map((r, i) =>
      `${i + 1}. [${r.citation.documentTitle} - Trang ${r.citation.page}]\n   "${r.content.trim()}"`
    )
  ].join("\n");
}

function renderIncidents(result, copy) {
  if (!result.incidents?.length) return `Danh sách sự cố:\n${copy.noData}`;
  return [
    "⚠️ **Danh sách sự cố ghi nhận:**",
    ...result.incidents.map((inc) =>
      `- [${inc.severity.toUpperCase()}] ${inc.title} (Thiết bị: ${inc.equipment}) - Trạng thái: ${inc.status}`
    )
  ].join("\n");
}

async function synthesizeWithOpenAI({ message, locale, toolResults, fallback }) {
  const client = new OpenAI({ apiKey: config.openaiApiKey });
  const response = await client.responses.create({
    model: config.openaiModel,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "You are the Lab Resource Manager operations assistant.",
              "Answer only from the supplied tool results. Do not invent resources, bookings, telemetry, users, or notifications.",
              "Use concise operational language. If data is missing, ask for the exact missing fields.",
              `Respond in ${locale === "en" ? "English" : "Vietnamese"}.`
            ].join("\n")
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({ question: message, toolResults, fallback }, null, 2)
          }
        ]
      }
    ]
  });
  return response.output_text?.trim() || fallback;
}

async function synthesizeGeneralWithOpenAI({ message, locale, wikiResult, fallback }) {
  const client = new OpenAI({ apiKey: config.openaiApiKey });
  const response = await client.responses.create({
    model: config.openaiModel,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "You answer general knowledge questions for users of a lab operations system.",
              "When an external source summary is supplied, use it as the primary source and cite its URL.",
              "Do not pretend the answer came from lab operational data.",
              `Respond in ${locale === "en" ? "English" : "Vietnamese"}.`
            ].join("\n")
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({ question: message, externalSource: wikiResult, fallback }, null, 2)
          }
        ]
      }
    ]
  });
  return response.output_text?.trim() || fallback;
}

async function searchWikipedia(message, locale) {
  const language = locale === "en" ? "en" : "vi";
  const query = buildKnowledgeQuery(message);
  if (!query) return null;

  const searchUrl = `https://${language}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=1`;
  const searchResponse = await fetch(searchUrl, {
    headers: { "user-agent": "lab-resource-manager/0.1 operations-assistant" }
  });
  if (!searchResponse.ok) return null;

  const searchBody = await searchResponse.json();
  const page = searchBody?.query?.search?.[0];
  if (!page?.title) return null;

  const summaryUrl = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.title)}`;
  const summaryResponse = await fetch(summaryUrl, {
    headers: { "user-agent": "lab-resource-manager/0.1 operations-assistant" }
  });
  if (!summaryResponse.ok) return null;

  const summary = await summaryResponse.json();
  if (!summary?.extract) return null;

  return {
    source: "Wikipedia",
    title: summary.title || page.title,
    extract: summary.extract,
    url: summary.content_urls?.desktop?.page || `https://${language}.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
    retrievedAt: new Date().toISOString(),
    updatedAt: page.timestamp || null
  };
}

function renderWikipediaAnswer(result, copy) {
  const summary = compactExtract(result.extract);
  const sourceLabel = copy.localeCode === "en-US" ? "Source" : "Nguồn";
  const retrievedLabel = copy.localeCode === "en-US" ? "retrieved" : "truy cập";
  return `${result.title}: ${summary}\n\n${sourceLabel}: ${result.url} (${retrievedLabel}: ${formatDate(result.retrievedAt, copy)})`;
}

function compactExtract(extract) {
  const text = String(extract || "").replace(/\s+/g, " ").trim();
  if (text.length <= 700) return text;
  const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 3).join(" ");
  return sentences.length >= 120 && sentences.length <= 700 ? sentences : `${text.slice(0, 680).trim()}...`;
}

function renderSummary(result, copy) {
  const totals = result.totals || {};
  const lines = [
    `${copy.summary}`,
    `- ${copy.totalResources}: ${totals.resources ?? 0}`,
    `- ${copy.pendingBookings}: ${totals.pendingBookings ?? 0}`,
    `- ${copy.unreadNotifications}: ${totals.unreadNotifications ?? 0}`,
    `- ${copy.alerts}: ${totals.alerts ?? 0}`
  ];
  if (result.alerts?.length) {
    lines.push(`- ${copy.attention}: ${result.alerts.map((item) => `${item.code} (${labelStatus(item.status, copy)}, ${labelOperationalState(item.operational?.state, copy)})`).join(", ")}`);
  }
  return lines.join("\n");
}

function renderResources(result, copy) {
  if (!result.resources?.length) return `${copy.resources}\n${copy.noData}`;
  return [
    `${copy.resources}`,
    ...result.resources.map((item) => {
      const type = labelResourceType(item.type, copy);
      const status = labelStatus(item.status, copy);
      const operational = labelOperationalState(item.operational?.state, copy);
      return `- ${item.code} - ${item.name} (${type}, ${status}, ${operational}, ${item.location})`;
    })
  ].join("\n");
}

function renderSlots(result, copy) {
  if (!result.slots?.length) return `${copy.slots}\n${copy.noData}`;
  return [
    `${copy.slots}`,
    ...result.slots.map((slot) => `- ${slot.resourceCode} - ${slot.resourceName}: ${formatDate(slot.startAt, copy)} ${copy.rangeSeparator} ${formatDate(slot.endAt, copy)} (${slot.location})`)
  ].join("\n");
}

function renderConflicts(result, copy) {
  if (!result.valid) return `${copy.conflicts}\n${copy.askTime}`;
  if (result.available) {
    return `${copy.conflicts}\n- ${result.resource.code} ${copy.availableRequested}.`;
  }
  const conflicts = result.conflicts?.length
    ? result.conflicts.map((item) => `- ${item.resource?.code}: ${formatDate(item.startAt, copy)} ${copy.rangeSeparator} ${formatDate(item.endAt, copy)} (${labelStatus(item.status, copy)})`).join("\n")
    : copy.noData;
  const alternatives = result.alternativeSlots?.length
    ? `\n\n${renderSlots({ slots: result.alternativeSlots }, copy)}`
    : "";
  return `${copy.conflicts}\n${conflicts}${alternatives}`;
}

function renderBookings(result, copy) {
  if (!result.bookings?.length) return `${copy.bookings}\n${copy.noData}`;
  return [
    `${copy.bookings}`,
    ...result.bookings.map((item) => {
      const duration = item.durationMinutes ? `, ${formatDuration(item.durationMinutes, copy)}` : "";
      return `- ${item.resource?.code || "-"}: ${item.title} - ${formatDate(item.startAt, copy)} ${copy.rangeSeparator} ${formatDate(item.endAt, copy)} (${labelStatus(item.status, copy)}${duration})`;
    })
  ].join("\n");
}

function renderNotifications(result, copy) {
  if (!result.notifications?.length) return `${copy.notifications}\n${copy.noData}`;
  return [
    `${copy.notifications}`,
    ...result.notifications.map((item) => {
      const title = renderNotificationTitle(item, copy);
      const message = renderNotificationMessage(item, copy);
      return `- ${title}: ${message} (${labelSeverity(item.severity, copy)})`;
    })
  ].join("\n");
}

function renderNotificationTitle(item, copy) {
  const labels = localeLabels(copy);
  return (item.titleKey && labels.notificationTitles[item.titleKey]) || item.title || item.titleKey || "-";
}

function renderNotificationMessage(item, copy) {
  const labels = localeLabels(copy);
  const template = item.messageKey && labels.notificationMessages[item.messageKey];
  return template ? interpolate(template, item.messageParams || {}) : item.message || "-";
}

function labelStatus(status, copy) {
  return localeLabels(copy).statuses[status] || status || "-";
}

function labelResourceType(type, copy) {
  return localeLabels(copy).resourceTypes[type] || type || "-";
}

function labelOperationalState(state, copy) {
  return localeLabels(copy).operationalStates[state] || state || "-";
}

function labelSeverity(severity, copy) {
  return localeLabels(copy).severities[severity] || severity || "-";
}

function formatDuration(minutes, copy) {
  const value = Number(minutes);
  if (!Number.isFinite(value)) return "-";
  if (copy.localeCode === "en-US") return `${value} min`;
  return `${value} phút`;
}

function localeLabels(copy) {
  return LABELS[copy.localeCode === "en-US" ? "en" : "vi"];
}

function interpolate(template, params = {}) {
  return String(template || "").replace(/\{([^}]+)\}/g, (_, key) => {
    const value = params[key];
    return value === null || value === undefined || value === "" ? "-" : String(value);
  });
}

function buildDataQuality(toolResults) {
  return {
    generatedAt: new Date().toISOString(),
    sources: toolResults.map((item) => ({
      tool: item.tool,
      input: item.input,
      resultCount: resultCount(item.result)
    }))
  };
}

function resultCount(result) {
  if (!result || typeof result !== "object") return 0;
  if (typeof result.count === "number") return result.count;
  if (Array.isArray(result.resources)) return result.resources.length;
  if (Array.isArray(result.slots)) return result.slots.length;
  if (Array.isArray(result.bookings)) return result.bookings.length;
  if (Array.isArray(result.notifications)) return result.notifications.length;
  if (Array.isArray(result.alerts)) return result.alerts.length;
  return 1;
}

function getSuggestedActions(toolResults, copy) {
  const actions = [];
  if (toolResults.some((item) => item.tool === "find_available_slots")) {
    actions.push(copy.suggestions[1]);
  }
  if (toolResults.some((item) => item.tool === "get_operational_summary")) {
    actions.push(copy.suggestions[2]);
  }
  return actions.slice(0, 3);
}

function localeCopy(locale) {
  return LOCALES[locale === "en" ? "en" : "vi"];
}

function isAccountQuestion(normalizedMessage) {
  return hasAny(normalizedMessage, [
    "toi la ai",
    "tai khoan cua toi",
    "vai tro cua toi",
    "quyen cua toi",
    "who am i",
    "my account",
    "my role",
    "my permissions"
  ]);
}

function isOperationalQuestion(message, normalizedMessage) {
  if (detectResourceCode(message)) return true;
  return hasAny(normalizedMessage, [
    "assistant",
    "booking",
    "canh bao",
    "camera",
    "check in",
    "check out",
    "chung chi",
    "dao tao",
    "dat lich",
    "device",
    "goi y",
    "gpu",
    "handover",
    "hieu suat",
    "huong dan",
    "incident",
    "lab",
    "lich",
    "maintenance",
    "manual",
    "monitor",
    "nhat ky",
    "notification",
    "phong",
    "policy",
    "raspberry",
    "recommend",
    "resource",
    "sop",
    "su co",
    "tai nguyen",
    "telemetry",
    "thiet bi",
    "thong bao",
    "training",
    "uav",
    "vram"
  ]);
}

function buildKnowledgeQuery(message) {
  const normalized = normalizeSearchQuery(message, 180);
  if (!normalized) return "";
  const searchable = removeDiacritics(normalized.toLowerCase());
  return searchable
    .replace(/\b(cho toi biet|hay cho biet|vui long|please|search|tim kiem|tim)\b/gi, " ")
    .replace(/\b(la ai|la gi|doi nao|da o dau|dang da o dau|dang choi cho doi nao|who is|what is|plays for|which team|current team)\b/gi, " ")
    .replace(/\b(ai|la|gi|doi|nao|o|dau|dang|da|choi|cho|club|team)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim() || normalized;
}

function labelRole(role, copy) {
  const labels = copy.localeCode === "en-US"
    ? { admin: "administrator", lab_staff: "lab staff", lecturer: "lecturer", student: "student" }
    : { admin: "quản trị viên", lab_staff: "cán bộ lab", lecturer: "giảng viên", student: "sinh viên" };
  return labels[role] || role || "-";
}

function detectResourceType(normalizedMessage) {
  const match = TYPE_KEYWORDS.find((item) => item.patterns.some((pattern) => normalizedMessage.includes(removeDiacritics(pattern))));
  return match?.type;
}

function detectResourceCode(message) {
  return message.match(/[A-Z]{2,}(?:-[A-Z0-9]+)+/i)?.[0]?.toUpperCase();
}

function detectDurationMinutes(normalizedMessage) {
  const hourMatch = normalizedMessage.match(/(\d+(?:[.,]\d+)?)\s*(gio|hour|hours|h)\b/);
  if (hourMatch) return Math.round(Number(hourMatch[1].replace(",", ".")) * 60);
  const minuteMatch = normalizedMessage.match(/(\d+)\s*(phut|minute|minutes|min|m)\b/);
  if (minuteMatch) return Number(minuteMatch[1]);
  return 120;
}

function detectDateRange(message = "", normalizedMessage = removeDiacritics(message.toLowerCase())) {
  const explicitDates = detectIsoDates(message);
  if (explicitDates.length) {
    const from = parseAssistantDate(explicitDates[0]);
    const to = explicitDates[1]
      ? parseAssistantDate(explicitDates[1], !explicitDates[1].includes("T"))
      : explicitDates[0].includes("T")
        ? addDays(from, 1)
        : endOfLocalDay(from);
    if (from && to && to > from) return { from: from.toISOString(), to: to.toISOString() };
  }

  const now = new Date();
  if (hasAny(normalizedMessage, ["hom nay", "today"])) {
    return { from: now.toISOString(), to: endOfLocalDay(now).toISOString() };
  }

  if (hasAny(normalizedMessage, ["ngay mai", "tomorrow"])) {
    const start = startOfLocalDay(addDays(now, 1));
    return { from: start.toISOString(), to: endOfLocalDay(start).toISOString() };
  }

  const dayMatch = normalizedMessage.match(/(\d{1,2})\s*(ngay|day|days)\b/);
  if (dayMatch) {
    const days = clampNumber(Number(dayMatch[1]), 1, 30, 7);
    return { from: now.toISOString(), to: addDays(now, days).toISOString() };
  }

  return defaultDateRange();
}

function detectIsoDates(message) {
  return Array.from(message.matchAll(/\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?Z?)?)?/g)).map((item) => item[0].replace(" ", "T"));
}

function extractSearchQuery(message, normalizedMessage, { type, resourceCode } = {}) {
  if (resourceCode) return resourceCode;

  const hardwareKeyword = detectHardwareKeyword(normalizedMessage);
  if (hardwareKeyword) return hardwareKeyword;
  if (type) return undefined;

  const dateFree = message.replace(/\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?Z?)?)?/g, " ");
  const durationFree = dateFree.replace(/\d+(?:[.,]\d+)?\s*(gio|hour|hours|h|phut|minute|minutes|min|m|ngay|day|days)\b/gi, " ");
  const words = durationFree
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}_-]+|[^\p{L}\p{N}_-]+$/gu, ""))
    .filter(Boolean)
    .filter((word) => !QUERY_STOP_WORDS.has(removeDiacritics(word.toLowerCase())));

  return normalizeSearchQuery(words.join(" ")) || undefined;
}

function detectHardwareKeyword(normalizedMessage) {
  if (normalizedMessage.includes("h100")) return "H100";
  if (normalizedMessage.includes("l40s")) return "L40S";
  if (normalizedMessage.includes("a100")) return "A100";
  if (normalizedMessage.includes("jetson")) return "Jetson";
  if (normalizedMessage.includes("realsense")) return "RealSense";
  if (normalizedMessage.includes("raspberry")) return "Raspberry";
  if (normalizedMessage.includes("uav") || normalizedMessage.includes("drone")) return "UAV";
  if (normalizedMessage.includes("ai")) return "AI";
  return undefined;
}

function defaultDateRange() {
  const from = new Date();
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  return { from: from.toISOString(), to: to.toISOString() };
}

function parseAssistantDate(value, endOfDay = false) {
  if (!value) return null;
  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return endOfDay ? endOfLocalDay(date) : date;
}

function startOfLocalDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfLocalDay(value) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function addDays(value, days) {
  if (!value) return null;
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function hasAny(value, keywords) {
  return keywords.some((keyword) => value.includes(removeDiacritics(keyword)));
}

function removeDiacritics(value) {
  if (!value) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/ơ/g, "o").replace(/Ơ/g, "O")
    .replace(/ư/g, "u").replace(/Ư/g, "U")
    .toLowerCase();
}

function formatDate(value, copy) {
  return new Intl.DateTimeFormat(copy.localeCode, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: copy.timeZone
  }).format(new Date(value));
}
