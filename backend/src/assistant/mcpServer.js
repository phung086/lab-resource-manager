import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";

import { searchExternalKnowledge } from "./assistantService.js";
import { runAssistantTool } from "./toolHandlers.js";

export function createLabResourceMcpServer(context) {
  const server = new McpServer({
    name: "lab-resource-manager",
    version: "0.2.0"
  });

  server.registerTool(
    "get_operational_summary",
    {
      title: "Get operational summary",
      description: "Summarize resource inventory, pending bookings, unread notifications, and monitoring alerts.",
      inputSchema: {}
    },
    async () => toolResult(await runAssistantTool("get_operational_summary", {}, context))
  );

  server.registerTool(
    "search_resources",
    {
      title: "Search resources",
      description: "Search lab resources by code, name, type, status, location, and latest telemetry.",
      inputSchema: {
        query: z.string().optional(),
        type: z.enum(["room", "gpu_server", "raspberry_pi", "uav", "camera", "kit", "material"]).optional(),
        status: z.enum(["available", "reserved", "in_use", "maintenance", "offline"]).optional(),
        limit: z.number().min(1).max(30).optional()
      }
    },
    async (input) => toolResult(await runAssistantTool("search_resources", input, context))
  );

  server.registerTool(
    "find_available_slots",
    {
      title: "Find available slots",
      description: "Find available booking slots for one resource or a resource type within an operating window.",
      inputSchema: {
        resourceCode: z.string().optional(),
        resourceType: z.enum(["room", "gpu_server", "raspberry_pi", "uav", "camera", "kit", "material"]).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        durationMinutes: z.number().min(15).max(720).optional(),
        limit: z.number().min(1).max(20).optional()
      }
    },
    async (input) => toolResult(await runAssistantTool("find_available_slots", input, context))
  );

  server.registerTool(
    "check_booking_conflicts",
    {
      title: "Check booking conflicts",
      description: "Check whether a specific requested time range conflicts with active bookings.",
      inputSchema: {
        resourceCode: z.string(),
        startAt: z.string(),
        endAt: z.string()
      }
    },
    async (input) => toolResult(await runAssistantTool("check_booking_conflicts", input, context))
  );

  server.registerTool(
    "search_bookings",
    {
      title: "Search bookings",
      description: "Search usage bookings by text, status, date range, and ownership.",
      inputSchema: {
        query: z.string().optional(),
        status: z.enum(["pending", "approved", "rejected", "cancelled", "checked_out", "completed"]).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        mine: z.boolean().optional(),
        limit: z.number().min(1).max(50).optional()
      }
    },
    async (input) => toolResult(await runAssistantTool("search_bookings", input, context))
  );

  server.registerTool(
    "search_notifications",
    {
      title: "Search notifications",
      description: "Read the signed-in user's notifications, optionally unread only.",
      inputSchema: {
        query: z.string().optional(),
        unreadOnly: z.boolean().optional(),
        limit: z.number().min(1).max(50).optional()
      }
    },
    async (input) => toolResult(await runAssistantTool("search_notifications", input, context))
  );

  server.registerTool(
    "search_external_knowledge",
    {
      title: "Search external knowledge",
      description: "Search a cited external knowledge source for out-of-lab questions. Operational decisions should still use the lab tools.",
      inputSchema: {
        query: z.string().min(2),
        locale: z.enum(["vi", "en"]).optional()
      }
    },
    async (input) => toolResult(await searchExternalKnowledge(input))
  );

  server.registerPrompt(
    "booking-advisor",
    {
      title: "Booking advisor",
      description: "Ask the assistant to find free slots or check a booking conflict.",
      argsSchema: {
        question: z.string().describe("User question about free slots, overlaps, resources, or notifications")
      }
    },
    async ({ question }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Use the lab-resource-manager tools to answer this operations question from live data: ${question}`
          }
        }
      ]
    })
  );

  server.registerResource(
    "tool-catalog",
    "lab-resource-manager://tools",
    {
      title: "Lab Resource Manager tools",
      description: "Available read-only operations tools for resources, bookings, notifications, and telemetry.",
      mimeType: "application/json"
    },
    async () => ({
      contents: [
        {
          uri: "lab-resource-manager://tools",
          mimeType: "application/json",
          text: JSON.stringify({
            tools: [
              "get_operational_summary",
              "search_resources",
              "find_available_slots",
              "check_booking_conflicts",
              "search_bookings",
              "search_notifications",
              "search_external_knowledge"
            ]
          })
        }
      ]
    })
  );

  return server;
}

function toolResult(value) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}
