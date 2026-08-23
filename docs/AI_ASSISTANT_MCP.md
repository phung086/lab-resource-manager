# AI Assistant and MCP Integration

## Scope

The assistant is an operations layer over live system data. It can answer questions about:

- Resource inventory, location, status, specs, and latest telemetry.
- Free booking slots and booking conflicts.
- Upcoming bookings and pending requests.
- The signed-in user's notifications.
- Operational alerts and summary metrics.

The assistant does not invent resources, bookings, users, telemetry, or notifications. Every answer is produced from authorized tools backed by PostgreSQL.

For questions outside lab operations, such as public people, organizations, or general concepts, the assistant uses a cited external knowledge lookup first. Operational decisions are never made from the external source; booking, inventory, alert, and notification answers still come from the authorized system tools.

## Runtime modes

The system has two modes:

- Local operations analyzer: always available, no model key required.
- OpenAI synthesis: optional. Set `OPENAI_API_KEY` and `OPENAI_MODEL` to let the model produce a more natural final answer from tool results.
- External knowledge lookup: always separate from operational data. It uses Wikipedia summaries with source URLs when the user asks a non-lab question.

If `OPENAI_API_KEY` or `OPENAI_MODEL` is missing, the assistant remains fully usable through the local analyzer.

## REST API

Authenticated users can call:

```http
GET /assistant/suggestions?locale=vi
GET /assistant/tools
POST /assistant/chat
```

Example chat body:

```json
{
  "message": "Tìm lịch trống cho máy chủ GPU trong 7 ngày tới",
  "locale": "vi"
}
```

The response includes:

- `answer`: user-facing response.
- `provider`: `local`, `openai`, `external`, or `account`.
- `toolsUsed`: tool names used for the answer.
- `toolResults`: raw structured tool output for auditability.
- `dataQuality`: generation time, tool input, and result counts used to verify what data shaped the answer.

Natural-language planning understands both Vietnamese and English operating questions, including:

- Devices that need attention.
- Free slots for a resource type or asset code.
- Booking conflicts for an explicit time window.
- Upcoming bookings within a detected date range.
- Resource searches by asset code, equipment type, or common AI hardware keywords.
- Account context questions, for example "Toi la ai?" or "Who am I?"
- General knowledge fallback, for example "Messi la ai?" or "Ronaldo da o doi nao?"

## MCP Endpoint

The same tool surface is exposed through MCP Streamable HTTP:

```http
POST /mcp
Authorization: Bearer <user-access-token>
Accept: application/json, text/event-stream
Content-Type: application/json
```

The MCP server exposes these read-only tools:

- `get_operational_summary`
- `search_resources`
- `find_available_slots`
- `check_booking_conflicts`
- `search_bookings`
- `search_notifications`
- `search_external_knowledge`

It also exposes:

- Prompt: `booking-advisor`
- Resource: `lab-resource-manager://tools`

Authorization is enforced before tool execution. Students and lecturers only see booking data they are allowed to access; admin and lab staff can inspect operational data more broadly.

`search_external_knowledge` is read-only and returns cited source data. MCP clients should use it only for non-operational context; they should use the lab tools for scheduling, inventory, monitoring, and notifications.

## OpenAI Configuration

Add these values to `.env` or `.env.production`:

```env
OPENAI_API_KEY=
OPENAI_MODEL=
```

Do not commit real secrets. For production, store the key in the deployment secret manager or `.env.production` on the server only.

## Design Notes

- MCP tools are used for live data and controlled actions. This follows the MCP model of exposing tools/resources/prompts to AI clients.
- The in-app assistant uses the same internal handlers as MCP, so REST and MCP results remain consistent.
- Write actions are intentionally not exposed to the assistant yet. Booking creation, approval, handover, status changes, and account management remain explicit UI/API workflows.

## Sources

- OpenAI MCP server guidance: https://developers.openai.com/apps-sdk/concepts/mcp-server
- OpenAI Responses API MCP/tools guidance: https://developers.openai.com/api/docs/guides/tools-connectors-mcp
- Model Context Protocol specification: https://modelcontextprotocol.io/specification/2025-06-18
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
