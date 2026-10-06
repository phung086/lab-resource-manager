import { config } from '../src/config.js';
import { CONVERSATION_LIMITS } from '../src/assistant/assistantConversation.js';
import { listAssistantTools } from '../src/assistant/assistantService.js';

// Configuration-only check: no DB read, provider request, key echo or billing.
const tools = listAssistantTools();
const hasApiKey = Boolean(config.openaiApiKey), hasModel = Boolean(config.openaiModel);
console.log(JSON.stringify({
  assistantEnabled: config.mcpAssistantEnabled,
  conversationalRouting: config.assistantConversationEnabled,
  provider: { hasApiKey, hasModel, status: !hasApiKey ? 'MISSING_KEY' : !hasModel ? 'MISSING_MODEL' : 'CONFIGURED_UNVERIFIED', liveVerified: false },
  transport: 'Responses API; authenticated local MCP bridge',
  tools: tools.map(({ name, readOnly }) => ({ name, readOnly })),
  limits: { conversationIdleMinutes: CONVERSATION_LIMITS.ttlMs / 60000, retainedTurns: CONVERSATION_LIMITS.maxTurns, processSessions: CONVERSATION_LIMITS.maxSessions, chatAndResetRequestsPerMinute: config.assistantRateLimit, concurrency: config.assistantConcurrency, deadlineMs: config.assistantTimeoutMs },
  reviewBeforeBusinessSubmission: true,
  secretsInBrowser: false
}, null, 2));
if (!tools.length || tools.some(tool => !tool.readOnly)) process.exitCode = 1;
