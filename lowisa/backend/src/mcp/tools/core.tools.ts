/**
 * MCP Tool Handlers — Core Tools
 *
 * Implements the remaining MCP tool handlers that are not covered by
 * specialized tool files:
 *   - authenticate_user
 *   - check_subscription
 *   - get_knowledge_map
 *   - update_knowledge
 *   - get_task_state
 *   - save_task_state
 *   - record_vibe_signal
 *   - get_vibe_history
 *
 * Requirements: 6.1, 7.1, 4.1, 4.2, 3.1, 5.1
 */
import {
  getOAuthRedirectUrl,
  type OAuthProvider,
} from "../../services/auth.service.js";
import { getSubscriptionStatus } from "../../services/subscription.service.js";
import {
  getKnowledgeMap,
  updateKnowledgeEntry,
} from "../../services/knowledge.service.js";
import {
  getTaskHistory,
  saveTaskState,
  getCurrentTask,
} from "../../services/task.service.js";
import { recordVibeSignal, getVibeHistory } from "../../services/vibe.service.js";
import { getUsageStatus } from "../../services/usage-tracker.service.js";
import type { VibeSignal } from "../../types/vibe.js";
import type { Task } from "../../types/task.js";

// ---------------------------------------------------------------------------
// Tool: authenticate_user
// ---------------------------------------------------------------------------

export interface AuthenticateUserParams {
  provider: OAuthProvider;
}

/**
 * Initiates OAuth flow by returning the redirect URL for the specified provider.
 *
 * MCP Tool: authenticate_user
 * Parameters: { provider: "google" | "github" }
 *
 * Returns: { redirect_url: string }
 */
export function handleAuthenticateUser(
  params: Record<string, unknown>,
): { redirect_url: string } {
  const { provider } = params as unknown as AuthenticateUserParams;
  const redirectUrl = getOAuthRedirectUrl(provider);
  return { redirect_url: redirectUrl };
}

// ---------------------------------------------------------------------------
// Tool: check_subscription
// ---------------------------------------------------------------------------

export interface CheckSubscriptionParams {
  user_id: string;
}

/**
 * Verifies the user's current subscription or trial status.
 *
 * MCP Tool: check_subscription
 * Parameters: { user_id: string }
 *
 * Returns: SubscriptionState object
 */
export async function handleCheckSubscription(
  params: Record<string, unknown>,
): Promise<unknown> {
  const { user_id } = params as unknown as CheckSubscriptionParams;
  return getSubscriptionStatus(user_id);
}

// ---------------------------------------------------------------------------
// Tool: get_knowledge_map
// ---------------------------------------------------------------------------

export interface GetKnowledgeMapParams {
  user_id: string;
  project_id: string;
}

/**
 * Fetches the user's knowledge state for a specific project.
 *
 * MCP Tool: get_knowledge_map
 * Parameters: { user_id: string, project_id: string }
 *
 * Returns: KnowledgeMap object
 */
export async function handleGetKnowledgeMap(
  params: Record<string, unknown>,
): Promise<unknown> {
  const { user_id, project_id } = params as unknown as GetKnowledgeMapParams;
  return getKnowledgeMap(user_id, project_id);
}

// ---------------------------------------------------------------------------
// Tool: update_knowledge
// ---------------------------------------------------------------------------

export interface UpdateKnowledgeParams {
  user_id: string;
  module: string;
  competency: string;
  level: number;
}

/**
 * Records a demonstrated competency in the user's knowledge map.
 *
 * MCP Tool: update_knowledge
 * Parameters: { user_id: string, module: string, competency: string, level: number }
 *
 * Returns: { success: true }
 */
export async function handleUpdateKnowledge(
  params: Record<string, unknown>,
): Promise<{ success: boolean }> {
  const { user_id, module, competency, level } = params as unknown as UpdateKnowledgeParams;

  // Extract project_id from module path or use a default
  // The module path format is "project_id/module_path" or just "module_path"
  const projectId = (params as Record<string, unknown>).project_id as string | undefined ?? "default";

  await updateKnowledgeEntry(user_id, projectId, module, {
    status: "practiced",
    competencyName: competency,
    competencyLevel: level,
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Tool: get_task_state
// ---------------------------------------------------------------------------

export interface GetTaskStateParams {
  user_id: string;
  project_id: string;
}

/**
 * Fetches the current task progress for a user/project.
 * Returns the current in-progress task and recent task history.
 *
 * MCP Tool: get_task_state
 * Parameters: { user_id: string, project_id: string }
 *
 * Returns: { current_task: Task | null, history: Task[] }
 */
export async function handleGetTaskState(
  params: Record<string, unknown>,
): Promise<{ current_task: Task | null; history: Task[] }> {
  const { user_id, project_id } = params as unknown as GetTaskStateParams;

  const [currentTask, history] = await Promise.all([
    getCurrentTask(user_id, project_id),
    getTaskHistory(user_id, project_id),
  ]);

  return { current_task: currentTask, history };
}

// ---------------------------------------------------------------------------
// Tool: save_task_state
// ---------------------------------------------------------------------------

export interface SaveTaskStateParams {
  user_id: string;
  task: Partial<Task>;
}

/**
 * Persists task completion or progress update.
 *
 * MCP Tool: save_task_state
 * Parameters: { user_id: string, task: TaskObject }
 *
 * Returns: The saved Task object
 */
export async function handleSaveTaskState(
  params: Record<string, unknown>,
): Promise<Task> {
  const { user_id, task } = params as unknown as SaveTaskStateParams;
  return saveTaskState(user_id, task);
}

// ---------------------------------------------------------------------------
// Tool: record_vibe_signal
// ---------------------------------------------------------------------------

export interface RecordVibeSignalParams {
  user_id: string;
  signal: {
    signal_type: VibeSignal["signal_type"];
    value: number;
    context: string;
  };
}

/**
 * Logs an interaction pattern data point for vibe detection.
 *
 * MCP Tool: record_vibe_signal
 * Parameters: { user_id: string, signal: VibeSignal }
 *
 * Returns: { success: true }
 */
export async function handleRecordVibeSignal(
  params: Record<string, unknown>,
): Promise<{ success: boolean }> {
  const { user_id, signal } = params as unknown as RecordVibeSignalParams;

  const vibeSignal: VibeSignal = {
    timestamp: new Date(),
    signal_type: signal.signal_type,
    value: signal.value,
    context: signal.context,
  };

  await recordVibeSignal(user_id, vibeSignal);

  return { success: true };
}

// ---------------------------------------------------------------------------
// Tool: get_vibe_history
// ---------------------------------------------------------------------------

export interface GetVibeHistoryParams {
  user_id: string;
  window_minutes: number;
}

/**
 * Fetches recent vibe signals within the specified time window.
 *
 * MCP Tool: get_vibe_history
 * Parameters: { user_id: string, window_minutes: number }
 *
 * Returns: VibeSignal[]
 */
export async function handleGetVibeHistory(
  params: Record<string, unknown>,
): Promise<VibeSignal[]> {
  const { user_id, window_minutes } = params as unknown as GetVibeHistoryParams;
  return getVibeHistory(user_id, window_minutes);
}


// ---------------------------------------------------------------------------
// Tool: get_usage_status
// ---------------------------------------------------------------------------

export interface GetUsageStatusParams {
  user_id: string;
}

/**
 * Returns the user's current daily usage status without recording additional usage.
 * Includes minutes used, limit, and warning/blocked flags.
 * Also includes the subscribe URL for convenience.
 *
 * MCP Tool: get_usage_status
 * Parameters: { user_id: string }
 *
 * Returns: { used_minutes, limit_minutes, warning, blocked, subscribe_url }
 */
export async function handleGetUsageStatus(
  params: { user_id: string },
): Promise<{
  used_minutes: number;
  limit_minutes: number;
  warning: boolean;
  blocked: boolean;
  subscribe_url: string;
}> {
  const usage = await getUsageStatus(params.user_id);

  return {
    used_minutes: Math.round(usage.used / 60),
    limit_minutes: Math.round(usage.limit / 60),
    warning: usage.warning,
    blocked: usage.blocked,
    subscribe_url: "https://buy.polar.sh/polar_cl_kXEFmmE48e3Z1lc9820WJOgTeMB5ANzwzJMTV4MQJbr",
  };
}
