import { McpServer, fromJsonSchema } from "@modelcontextprotocol/server";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { assistantTools } from "./toolHandlers.js";
import { config } from "../config.js";
import { HttpError } from "../middleware/errors.js";
export async function handleMcp(req, res, next) {
  if (req.headers.origin && !config.corsOrigins.includes(req.headers.origin))
    return next(
      new HttpError(403, "Origin is not allowed.", undefined, "FORBIDDEN"),
    );
  const server = new McpServer({
    name: "lab-resource-manager",
    version: "1.0.0",
  });
  for (const t of assistantTools)
    server.registerTool(
      t.name,
      {
        description: t.description,
        inputSchema: fromJsonSchema(t.inputSchema),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async (input) => {
        try {
          const result = await t.handler(input, req.user);
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            structuredContent: result,
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: {
                    code:
                      error instanceof HttpError
                        ? error.code
                        : "DATA_UNAVAILABLE",
                    message:
                      error instanceof HttpError
                        ? error.message
                        : "Dữ liệu chưa thể truy cập. Vui lòng thử lại.",
                  },
                }),
              },
            ],
          };
        }
      },
    );
  const transport = new NodeStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    if (!res.headersSent)
      next(
        new HttpError(503, "MCP chưa sẵn sàng.", undefined, "MCP_UNAVAILABLE"),
      );
  }
}
