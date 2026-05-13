/**
 * MCP Server — Standard Model Context Protocol server using the official SDK.
 *
 * Uses @modelcontextprotocol/sdk with SSE transport for Continue.dev integration.
 * Exposes all LoWisa tools via the standard MCP protocol and serves the system
 * prompt via the MCP "prompts" primitive (the correct way to deliver system prompts
 * from a server without exposing them in client config).
 *
 * Endpoints:
 *   GET  /mcp/sse     — SSE connection (event stream)
 *   POST /mcp/message — JSON-RPC message endpoint
 *
 * Requirements: 9.1, 9.4
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { verifyAccessToken } from "../services/auth.service.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getSystemPrompt } from "../services/prompt.service.js";

// Tool handlers
import {
  handleGetUserPreferences,
  handleSaveUserPreferences,
} from "./tools/preferences.tools.js";
import {
  handleGetMentorshipStatus,
  handleSetGraduationStatus,
} from "./tools/mode.tools.js";
import {
  handleValidateTaskCompletion,
  handleIntegrateValidatedCode,
} from "./tools/validation.tools.js";
import {
  handleAnalyzeWorkspace,
  handleGetProjectAnalysis,
} from "./tools/workspace.tools.js";
import {
  handleGetProjectTemplates,
  handleScaffoldProject,
  handleSaveProjectInitPlan,
} from "./tools/project-init.tools.js";
import {
  handleSaveFoundationalAssessment,
  handleGetSkillLevel,
} from "./tools/assessment.tools.js";
import {
  handleAuthenticateUser,
  handleCheckSubscription,
  handleGetKnowledgeMap,
  handleUpdateKnowledge,
  handleGetTaskState,
  handleSaveTaskState,
  handleRecordVibeSignal,
  handleGetVibeHistory,
  handleGetUsageStatus,
} from "./tools/core.tools.js";


// ---------------------------------------------------------------------------
// Types (preserved for backward compatibility with tool handlers)
// ---------------------------------------------------------------------------

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: object;
}

export interface MCPToolInvocation {
  tool: string;
  parameters: Record<string, unknown>;
}

export interface MCPToolResponse {
  success: boolean;
  result?: unknown;
  error?: string;
}

export type MCPToolHandler = (
  params: Record<string, unknown>,
) => Promise<unknown> | unknown;

// ---------------------------------------------------------------------------
// Tool Definitions — Standard MCP format with inputSchema
// ---------------------------------------------------------------------------

const TOOL_DEFINITIONS = [
  {
    name: "get_system_prompt",
    description: "Retrieve the full LoWisa system prompt. Call this before responding to any user message.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "authenticate_user",
    description: "Initiate OAuth flow and return session tokens",
    inputSchema: {
      type: "object" as const,
      properties: { provider: { type: "string", enum: ["google", "github"] } },
      required: ["provider"],
    },
  },
  {
    name: "check_subscription",
    description: "Verify active subscription or trial status",
    inputSchema: {
      type: "object" as const,
      properties: { user_id: { type: "string" } },
      required: ["user_id"],
    },
  },
  {
    name: "get_knowledge_map",
    description: "Fetch user's knowledge state for a project",
    inputSchema: {
      type: "object" as const,
      properties: { user_id: { type: "string" }, project_id: { type: "string" } },
      required: ["user_id", "project_id"],
    },
  },
  {
    name: "update_knowledge",
    description: "Record demonstrated competency in the knowledge map",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: { type: "string" },
        module: { type: "string" },
        competency: { type: "string" },
        level: { type: "number" },
      },
      required: ["user_id", "module", "competency", "level"],
    },
  },
  {
    name: "get_task_state",
    description: "Fetch current task progress for a project",
    inputSchema: {
      type: "object" as const,
      properties: { user_id: { type: "string" }, project_id: { type: "string" } },
      required: ["user_id", "project_id"],
    },
  },
  {
    name: "save_task_state",
    description: "Persist task completion or progress",
    inputSchema: {
      type: "object" as const,
      properties: { user_id: { type: "string" }, task: { type: "object" } },
      required: ["user_id", "task"],
    },
  },
  {
    name: "get_user_preferences",
    description: "Fetch user mode preference and settings",
    inputSchema: {
      type: "object" as const,
      properties: { user_id: { type: "string" } },
      required: ["user_id"],
    },
  },
  {
    name: "save_user_preferences",
    description: "Persist user mode and settings changes",
    inputSchema: {
      type: "object" as const,
      properties: { user_id: { type: "string" }, preferences: { type: "object" } },
      required: ["user_id", "preferences"],
    },
  },
  {
    name: "record_vibe_signal",
    description: "Log interaction pattern data for vibe detection",
    inputSchema: {
      type: "object" as const,
      properties: { user_id: { type: "string" }, signal: { type: "object" } },
      required: ["user_id", "signal"],
    },
  },
  {
    name: "get_vibe_history",
    description: "Fetch recent vibe signals within a time window",
    inputSchema: {
      type: "object" as const,
      properties: { user_id: { type: "string" }, window_minutes: { type: "number" } },
      required: ["user_id", "window_minutes"],
    },
  },
  {
    name: "analyze_workspace",
    description: "Trigger deep workspace analysis on a project path",
    inputSchema: {
      type: "object" as const,
      properties: { project_path: { type: "string" }, user_id: { type: "string" } },
      required: ["project_path", "user_id"],
    },
  },
  {
    name: "get_project_analysis",
    description: "Fetch cached workspace analysis results",
    inputSchema: {
      type: "object" as const,
      properties: { project_id: { type: "string" }, user_id: { type: "string" } },
      required: ["project_id", "user_id"],
    },
  },
  {
    name: "get_project_templates",
    description: "Fetch available project templates and types",
    inputSchema: {
      type: "object" as const,
      properties: { category: { type: "string" } },
      required: [],
    },
  },
  {
    name: "save_project_init_plan",
    description: "Persist a new project initialization plan with tasks",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: { type: "string" },
        project_name: { type: "string" },
        tech_stack: { type: "array", items: { type: "string" } },
        project_type: { type: "string" },
        tasks: { type: "array", items: { type: "object" } },
      },
      required: ["user_id", "project_name", "tech_stack", "project_type", "tasks"],
    },
  },
  {
    name: "validate_task_completion",
    description: "Validate user code for correctness and project scope fit",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: { type: "string" },
        task_id: { type: "string" },
        target_files: { type: "array", items: { type: "string" } },
        project_id: { type: "string" },
      },
      required: ["user_id", "task_id", "target_files", "project_id"],
    },
  },
  {
    name: "integrate_validated_code",
    description: "Integrate validated user code into the project",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: { type: "string" },
        task_id: { type: "string" },
        target_files: { type: "array", items: { type: "string" } },
      },
      required: ["user_id", "task_id", "target_files"],
    },
  },
  {
    name: "scaffold_project",
    description: "Generate project scaffolding instructions for model/IDE",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_name: { type: "string" },
        project_type: { type: "string" },
        tech_stack: { type: "array", items: { type: "string" } },
      },
      required: ["project_name", "project_type", "tech_stack"],
    },
  },
  {
    name: "get_mentorship_status",
    description: "Check if mentorship is active or user has graduated",
    inputSchema: {
      type: "object" as const,
      properties: { user_id: { type: "string" }, project_id: { type: "string" } },
      required: ["user_id", "project_id"],
    },
  },
  {
    name: "set_graduation_status",
    description: "Mark user as graduated (independent) for a project",
    inputSchema: {
      type: "object" as const,
      properties: { user_id: { type: "string" }, project_id: { type: "string" } },
      required: ["user_id", "project_id"],
    },
  },
  {
    name: "save_foundational_assessment",
    description: "Persist user's assessed skill level",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: { type: "string" },
        level: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
        assessment_signals: { type: "object" },
      },
      required: ["user_id", "level", "assessment_signals"],
    },
  },
  {
    name: "get_skill_level",
    description: "Fetch user's current assessed skill level",
    inputSchema: {
      type: "object" as const,
      properties: { user_id: { type: "string" } },
      required: ["user_id"],
    },
  },
  {
    name: "get_usage_status",
    description: "Get the user's current daily usage status including minutes used, limit, and whether they are warned or blocked. Use this at session start to show the user their plan status.",
    inputSchema: {
      type: "object" as const,
      properties: { user_id: { type: "string" } },
      required: ["user_id"],
    },
  },
];


// ---------------------------------------------------------------------------
// Tool Handler Registry — Maps tool names to handler functions
// ---------------------------------------------------------------------------

const TOOL_HANDLERS: Map<string, MCPToolHandler> = new Map([
  ["get_system_prompt", () => ({ prompt: getSystemPrompt() })],
  ["authenticate_user", handleAuthenticateUser],
  ["check_subscription", handleCheckSubscription],
  ["get_knowledge_map", handleGetKnowledgeMap],
  ["update_knowledge", handleUpdateKnowledge],
  ["get_task_state", handleGetTaskState],
  ["save_task_state", handleSaveTaskState],
  ["get_user_preferences", (p) => handleGetUserPreferences(p as unknown as { user_id: string })],
  ["save_user_preferences", (p) => handleSaveUserPreferences(p as unknown as { user_id: string; preferences: Record<string, unknown> })],
  ["record_vibe_signal", handleRecordVibeSignal],
  ["get_vibe_history", handleGetVibeHistory],
  ["analyze_workspace", (p) => handleAnalyzeWorkspace(p as unknown as { project_path: string; user_id: string })],
  ["get_project_analysis", (p) => handleGetProjectAnalysis(p as unknown as { project_id: string; user_id: string })],
  ["get_project_templates", (p) => handleGetProjectTemplates(p as unknown as { category?: string })],
  ["save_project_init_plan", (p) => handleSaveProjectInitPlan(p as unknown as Parameters<typeof handleSaveProjectInitPlan>[0])],
  ["validate_task_completion", (p) => handleValidateTaskCompletion(p as unknown as Parameters<typeof handleValidateTaskCompletion>[0])],
  ["integrate_validated_code", (p) => handleIntegrateValidatedCode(p as unknown as Parameters<typeof handleIntegrateValidatedCode>[0])],
  ["scaffold_project", (p) => handleScaffoldProject(p as unknown as Parameters<typeof handleScaffoldProject>[0])],
  ["get_mentorship_status", (p) => handleGetMentorshipStatus(p as unknown as { user_id: string; project_id: string })],
  ["set_graduation_status", (p) => handleSetGraduationStatus(p as unknown as { user_id: string; project_id: string })],
  ["save_foundational_assessment", (p) => handleSaveFoundationalAssessment(p as unknown as Parameters<typeof handleSaveFoundationalAssessment>[0])],
  ["get_skill_level", (p) => handleGetSkillLevel(p as unknown as { user_id: string })],
  ["get_usage_status", (p) => handleGetUsageStatus(p as unknown as { user_id: string })],
]);

// ---------------------------------------------------------------------------
// MCP Server Instance (official SDK)
// ---------------------------------------------------------------------------

/**
 * Creates a new MCP Server instance with tools and prompts capabilities.
 * Each SSE connection gets its own server instance paired with a transport.
 */
function createMCPServer(): Server {
  const server = new Server(
    { name: "lowisa", version: "1.0.0" },
    { capabilities: { tools: {}, prompts: {} } },
  );

  // -------------------------------------------------------------------------
  // Tools — List all available tools
  // -------------------------------------------------------------------------
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS,
  }));

  // -------------------------------------------------------------------------
  // Tools — Call a specific tool
  // -------------------------------------------------------------------------
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    const handler = TOOL_HANDLERS.get(toolName);
    if (!handler) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              error: `Unknown tool: "${toolName}". Available: ${Array.from(TOOL_HANDLERS.keys()).join(", ")}`,
            }),
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await handler(args);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ success: true, result }) }],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: message }) }],
        isError: true,
      };
    }
  });

  // -------------------------------------------------------------------------
  // Prompts — List available prompts (the standard way to serve system prompts)
  // -------------------------------------------------------------------------
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: "lowisa-system",
        description: "LoWisa full operating instructions — loaded automatically on session start",
      },
    ],
  }));

  // -------------------------------------------------------------------------
  // Prompts — Get a specific prompt
  // -------------------------------------------------------------------------
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    if (request.params.name === "lowisa-system") {
      return {
        messages: [
          {
            role: "user" as const,
            content: { type: "text" as const, text: getSystemPrompt() },
          },
        ],
      };
    }

    throw new Error(`Unknown prompt: "${request.params.name}"`);
  });

  return server;
}

// ---------------------------------------------------------------------------
// Express Router — SSE Transport Integration
// ---------------------------------------------------------------------------

/**
 * Active SSE transports keyed by session ID.
 * Each connected client gets its own transport + server pair.
 */
const transports: Map<string, SSEServerTransport> = new Map();

/**
 * Creates the Express router that implements the standard MCP SSE protocol:
 *   GET  /sse     — Establishes SSE connection, emits `endpoint` event
 *   POST /message — Receives JSON-RPC messages from the client
 */
export function createMCPRouter(): Router {
  const router = Router();

  // ---------------------------------------------------------------------------
  // GET /sse — SSE connection endpoint
  // Continue.dev connects here and receives an `endpoint` event telling it
  // where to POST messages.
  // ---------------------------------------------------------------------------
  router.get("/sse", async (req: Request, res: Response) => {
    // Create a new transport for this connection
    // The second argument is the path where the client should POST messages
    const transport = new SSEServerTransport("/mcp/message", res);

    // Store transport by session ID so we can route messages to it
    transports.set(transport.sessionId, transport);

    // Create a dedicated server instance for this connection
    const server = createMCPServer();

    // Clean up on disconnect
    req.on("close", () => {
      transports.delete(transport.sessionId);
      server.close().catch(() => {});
    });

    // Connect the server to the transport (starts the SSE stream)
    await server.connect(transport);
  });

  // ---------------------------------------------------------------------------
  // POST /message — JSON-RPC message endpoint
  // The client sends tool calls and other requests here.
  // The sessionId query parameter routes to the correct transport.
  // ---------------------------------------------------------------------------
  router.post("/message", async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string | undefined;

    if (!sessionId) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Missing sessionId query parameter" },
        id: null,
      });
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Session not found. Reconnect via GET /mcp/sse" },
        id: null,
      });
      return;
    }

    // Delegate the message to the transport (which routes it to the server)
    // Pass req.body as parsedBody since express.json() already consumed the stream
    await transport.handlePostMessage(req, res, req.body);
  });

  return router;
}

// ---------------------------------------------------------------------------
// Legacy exports for backward compatibility with tests
// ---------------------------------------------------------------------------

export const MCP_TOOL_DEFINITIONS: MCPToolDefinition[] = TOOL_DEFINITIONS.map((t) => ({
  name: t.name,
  description: t.description,
  parameters: t.inputSchema,
}));

export class MCPToolRouter {
  hasTool(name: string): boolean {
    return TOOL_HANDLERS.has(name);
  }

  getRegisteredTools(): string[] {
    return Array.from(TOOL_HANDLERS.keys());
  }

  async invoke(invocation: MCPToolInvocation): Promise<MCPToolResponse> {
    const handler = TOOL_HANDLERS.get(invocation.tool);
    if (!handler) {
      return {
        success: false,
        error: `Unknown tool: "${invocation.tool}". Available tools: ${this.getRegisteredTools().join(", ")}`,
      };
    }
    try {
      const result = await handler(invocation.parameters);
      return { success: true, result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  }
}

// ---------------------------------------------------------------------------
// Legacy Auth Middleware (kept for backward compatibility with tests)
// Not used in the standard MCP SSE flow, but available for custom routes.
// ---------------------------------------------------------------------------

/**
 * Verifies Bearer token on requests.
 * Extracts the JWT from the Authorization header and validates it.
 */
export function mcpAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Missing or invalid Authorization header. Expected: Bearer <token>",
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    (req as Request & { user?: { id: string; email: string } }).user = {
      id: payload.sub as string,
      email: payload.email as string,
    };
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: "Invalid or expired authentication token",
    });
  }
}

// Export router instance
export const mcpRouter = createMCPRouter();
export const toolRouter = new MCPToolRouter();
