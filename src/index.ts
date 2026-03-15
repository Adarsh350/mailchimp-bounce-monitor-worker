import { md5 } from "js-md5";

interface Env {
  MAILCHIMP_API_KEY: string;
  MAILCHIMP_SERVER_PREFIX: string;
  MAILCHIMP_LIST_ID: string;
  MAILCHIMP_WEBHOOK_SECRET: string;
}

interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface WorkerScheduledController {
  cron: string;
  scheduledTime: number;
}

interface MailchimpCampaign {
  id: string;
  status?: string;
  recipients?: {
    list_id?: string;
  };
  settings?: {
    title?: string;
    subject_line?: string;
  };
  send_time?: string;
}

interface MailchimpCampaignsResponse {
  campaigns?: MailchimpCampaign[];
  total_items?: number;
}

interface MailchimpEmailActivityEvent {
  action?: string;
  type?: string;
  timestamp?: string;
  url?: string;
}

interface MailchimpEmailActivityEntry {
  email_address?: string;
  activity?: MailchimpEmailActivityEvent[];
}

interface MailchimpEmailActivityResponse {
  email_activity?: MailchimpEmailActivityEntry[];
  total_items?: number;
}

interface MailchimpAbuseReport {
  email_address?: string;
}

interface MailchimpAbuseReportsResponse {
  abuse_reports?: MailchimpAbuseReport[];
  total_items?: number;
}

interface MailchimpErrorBody {
  status?: number;
  title?: string;
  detail?: string;
  type?: string;
  instance?: string;
  errors?: Array<{ field?: string; message?: string }>;
}

interface ParsedWebhookPayload {
  raw: Record<string, string>;
  type: string | null;
  email: string | null;
  reason: string | null;
}

const MAILCHIMP_PAGE_SIZE = 1000;
const MAX_RETRIES = 4;
const SOFT_BOUNCE_THRESHOLD = 3;
const MAX_WEBHOOK_BODY_BYTES = 64 * 1024;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      const webhookPath = getWebhookPath(env);

      if (safeEqual(url.pathname, webhookPath)) {
        if (request.method === "POST") {
          return await handleWebhook(request, env);
        }

        if (request.method === "GET") {
          return jsonResponse({ ok: true, service: "mailchimp-bounce-monitor" }, 200);
        }

        return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
      }

      if (url.pathname === "/healthz" && request.method === "GET") {
        return jsonResponse({ ok: true, service: "mailchimp-bounce-monitor" }, 200);
      }

      if (url.pathname === "/" && request.method === "GET") {
        return jsonResponse({ ok: true, service: "mailchimp-bounce-monitor" }, 200);
      }

      return jsonResponse({ ok: false, error: "Not found" }, 404);
    } catch (error) {
      log("request_error", { error: toErrorMessage(error) });
      return jsonResponse({ ok: false, error: "Internal server error" }, 500);
    }
  },

  async scheduled(
    controller: WorkerScheduledController,
    env: Env,
    ctx: WorkerExecutionContext
  ): Promise<void> {
    ctx.waitUntil(runSoftBounceReconciliation(env, controller.scheduledTime));
  }
};

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BODY_BYTES) {
    return jsonResponse({ ok: false, error: "Payload too large" }, 413);
  }

  const contentType = request.headers.get("content-type") ?? "";
  const supportedContentType =
    contentType.includes("application/json") ||
    contentType.includes("application/x-www-form-urlencoded");

  if (!supportedContentType) {
    return jsonResponse({ ok: false, error: "Unsupported content type" }, 415);
  }

  let payload: ParsedWebhookPayload;
  try {
    payload = await parseWebhookPayload(request);
  } catch (error) {
    log("webhook_parse_failed", { error: toErrorMessage(error) });
    return jsonResponse({ ok: false, error: "Invalid webhook payload" }, 400);
  }

  const eventType = normalizeWebhookType(payload.type, payload.reason);
  const email = normalizeEmail(payload.email);
  const reason = (payload.reason ?? "").trim();

  log("webhook_received", {
    type: eventType,
    email,
    reason,
    rawType: payload.type
  });

  if (!eventType) {
    return jsonResponse(
      {
        ok: false,
        error: "Webhook payload missing a supported event type"
      },
      400
    );
  }

  if (!email) {
    return jsonResponse(
      {
        ok: false,
        error: "Webhook payload missing a valid email address"
      },
      400
    );
  }

  if (eventType === "unsubscribe" || eventType === "abuse") {
    const result = await archiveMember(email, env, `webhook:${eventType}`);
    return jsonResponse(
      {
        ok: true,
        action: result.archived ? "archived" : "already_archived",
        reason: eventType,
        email
      },
      200
    );
  }

  if (eventType === "hard_bounce") {
    const result = await archiveMember(email, env, "webhook:hard_bounce");
    return jsonResponse(
      {
        ok: true,
        action: result.archived ? "archived" : "already_archived",
        reason: "hard_bounce",
        email
      },
      200
    );
  }

  if (eventType === "soft_bounce") {
    log("webhook_soft_bounce_observed", {
      email,
      message: "Soft bounces are counted during the daily reconciliation job.",
      reason
    });

    return jsonResponse(
      {
        ok: true,
        action: "ignored_until_daily_recount",
        reason: "soft_bounce",
        email
      },
      202
    );
  }

  log("webhook_ignored", { email, type: eventType, reason });

  return jsonResponse(
    {
      ok: true,
      action: "ignored",
      reason: eventType,
      email
    },
    200
  );
}

async function runSoftBounceReconciliation(env: Env, scheduledTime: number): Promise<void> {
  log("soft_bounce_reconciliation_started", {
    scheduledTime: new Date(scheduledTime).toISOString()
  });

  let abuseArchivedCount = 0;
  try {
    const abuseReports = await getListAbuseReports(env);
    for (const report of abuseReports) {
      const email = normalizeEmail(report.email_address);
      if (!email) {
        continue;
      }

      const result = await archiveMember(email, env, "scheduled:abuse_report");
      if (result.archived) {
        abuseArchivedCount += 1;
      }
    }

    log("abuse_report_reconciliation_completed", {
      abuseReportsProcessed: abuseReports.length,
      abuseArchivedCount
    });
  } catch (error) {
    log("abuse_report_reconciliation_failed", { error: toErrorMessage(error) });
  }

  const campaigns = await getSentCampaigns(env);
  const counts = new Map<string, number>();

  for (const campaign of campaigns) {
    const emailActivity = await getCampaignEmailActivity(campaign.id, env);

    for (const entry of emailActivity) {
      const email = normalizeEmail(entry.email_address);
      if (!email || !Array.isArray(entry.activity)) {
        continue;
      }

      const softBouncedInCampaign = entry.activity.some(isSoftBounceActivity);
      if (!softBouncedInCampaign) {
        continue;
      }

      counts.set(email, (counts.get(email) ?? 0) + 1);
    }
  }

  let archivedCount = 0;

  for (const [email, softBounceCount] of counts) {
    if (softBounceCount < SOFT_BOUNCE_THRESHOLD) {
      continue;
    }

    const result = await archiveMember(email, env, `scheduled:soft_bounce:${softBounceCount}`);
    if (result.archived) {
      archivedCount += 1;
    }

    log("soft_bounce_threshold_evaluated", {
      email,
      softBounceCount,
      archived: result.archived,
      alreadyArchived: result.alreadyArchived
    });
  }

  log("soft_bounce_reconciliation_completed", {
    campaignsProcessed: campaigns.length,
    emailsEvaluated: counts.size,
    abuseArchivedCount,
    archivedCount,
    summary: `Archived ${archivedCount} emails for soft bounces`
  });
}

function subscriberHash(email: string): string {
  return md5(email.trim().toLowerCase());
}

async function archiveMember(
  email: string,
  env: Env,
  source: string
): Promise<{ archived: boolean; alreadyArchived: boolean }> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error(`Cannot archive invalid email: ${email}`);
  }

  const hash = subscriberHash(normalizedEmail);
  const path = `/lists/${encodeURIComponent(env.MAILCHIMP_LIST_ID)}/members/${hash}`;

  try {
    await mailchimpRequest(path, env, { method: "DELETE" });
    log("member_archived", { email: normalizedEmail, source });
    return { archived: true, alreadyArchived: false };
  } catch (error) {
    if (isAlreadyArchivedError(error)) {
      log("member_already_archived", { email: normalizedEmail, source });
      return { archived: false, alreadyArchived: true };
    }

    log("member_archive_failed", {
      email: normalizedEmail,
      source,
      error: toErrorMessage(error)
    });
    throw error;
  }
}

async function getSentCampaigns(env: Env): Promise<MailchimpCampaign[]> {
  const campaigns: MailchimpCampaign[] = [];
  let offset = 0;

  while (true) {
    const response = await mailchimpRequest<MailchimpCampaignsResponse>(
      `/campaigns?status=sent&count=${MAILCHIMP_PAGE_SIZE}&offset=${offset}`,
      env
    );

    const page =
      (response.campaigns ?? []).filter(
        (campaign) => campaign.recipients?.list_id === env.MAILCHIMP_LIST_ID
      ) ?? [];
    campaigns.push(...page);

    log("campaigns_page_loaded", {
      offset,
      pageSize: page.length,
      totalLoaded: campaigns.length,
      totalItems: response.total_items ?? null
    });

    if (page.length < MAILCHIMP_PAGE_SIZE) {
      break;
    }

    offset += MAILCHIMP_PAGE_SIZE;
  }

  return campaigns;
}

async function getListAbuseReports(env: Env): Promise<MailchimpAbuseReport[]> {
  const reports: MailchimpAbuseReport[] = [];
  let offset = 0;

  while (true) {
    const response = await mailchimpRequest<MailchimpAbuseReportsResponse>(
      `/lists/${encodeURIComponent(env.MAILCHIMP_LIST_ID)}/abuse-reports?count=${MAILCHIMP_PAGE_SIZE}&offset=${offset}`,
      env
    );

    const page = response.abuse_reports ?? [];
    reports.push(...page);

    log("abuse_reports_page_loaded", {
      offset,
      pageSize: page.length,
      totalLoaded: reports.length,
      totalItems: response.total_items ?? null
    });

    if (page.length < MAILCHIMP_PAGE_SIZE) {
      break;
    }

    offset += MAILCHIMP_PAGE_SIZE;
  }

  return reports;
}

async function getCampaignEmailActivity(
  campaignId: string,
  env: Env
): Promise<MailchimpEmailActivityEntry[]> {
  const entries: MailchimpEmailActivityEntry[] = [];
  let offset = 0;

  while (true) {
    const response = await mailchimpRequest<MailchimpEmailActivityResponse>(
      `/reports/${encodeURIComponent(campaignId)}/email-activity?count=${MAILCHIMP_PAGE_SIZE}&offset=${offset}`,
      env
    );

    const page = response.email_activity ?? [];
    entries.push(...page);

    log("email_activity_page_loaded", {
      campaignId,
      offset,
      pageSize: page.length,
      totalLoaded: entries.length,
      totalItems: response.total_items ?? null
    });

    if (page.length < MAILCHIMP_PAGE_SIZE) {
      break;
    }

    offset += MAILCHIMP_PAGE_SIZE;
  }

  return entries;
}

async function countSoftBounces(email: string, env: Env): Promise<number> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return 0;
  }

  const campaigns = await getSentCampaigns(env);
  let softBounceCount = 0;

  for (const campaign of campaigns) {
    const activity = await getCampaignEmailActivity(campaign.id, env);
    const matchingEntry = activity.find(
      (entry) => normalizeEmail(entry.email_address) === normalizedEmail
    );

    if (!matchingEntry?.activity) {
      continue;
    }

    if (matchingEntry.activity.some(isSoftBounceActivity)) {
      softBounceCount += 1;
    }
  }

  return softBounceCount;
}

async function mailchimpRequest<T>(
  path: string,
  env: Env,
  init: RequestInit = {}
): Promise<T> {
  validateEnv(env);

  const baseUrl = `https://${env.MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0`;
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Basic ${btoa(`codex:${env.MAILCHIMP_API_KEY}`)}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });

    if (response.ok) {
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    }

    const errorBody = await safeParseMailchimpError(response);
    const error = new MailchimpApiError(response.status, errorBody, url);

    const shouldRetry =
      attempt < MAX_RETRIES && (response.status === 429 || response.status >= 500);

    log("mailchimp_request_failed", {
      url,
      method: init.method ?? "GET",
      attempt: attempt + 1,
      status: response.status,
      title: errorBody.title ?? null,
      detail: errorBody.detail ?? null,
      willRetry: shouldRetry
    });

    if (!shouldRetry) {
      throw error;
    }

    await sleep(getRetryDelayMs(response, attempt));
  }

  throw new Error(`Mailchimp request retries exhausted for ${url}`);
}

async function parseWebhookPayload(request: Request): Promise<ParsedWebhookPayload> {
  const contentType = request.headers.get("content-type") ?? "";
  const raw: Record<string, string> = {};
  let nestedType: string | undefined;
  let nestedEmail: string | undefined;
  let nestedReason: string | undefined;

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as Record<string, unknown>;
    for (const [key, value] of Object.entries(body)) {
      raw[key] = stringifyWebhookValue(value);
    }

    const data = isRecord(body.data) ? body.data : null;
    nestedType = typeof data?.type === "string" ? data.type : undefined;
    nestedEmail =
      typeof data?.email === "string"
        ? data.email
        : typeof data?.email_address === "string"
          ? data.email_address
          : undefined;
    nestedReason = typeof data?.reason === "string" ? data.reason : undefined;
  } else {
    const bodyText = await request.text();
    if (bodyText.length > MAX_WEBHOOK_BODY_BYTES) {
      throw new Error("Webhook payload too large");
    }
    const params = new URLSearchParams(bodyText);
    for (const [key, value] of params.entries()) {
      raw[key] = value;
    }
  }

  const type =
    firstNonEmpty(raw.type, raw["data[type]"], raw.event, raw["event_type"], nestedType) ?? null;

  const email =
    firstNonEmpty(
      raw.email,
      raw["data[email]"],
      raw.email_address,
      raw["data[email_address]"],
      nestedEmail
    ) ?? null;

  const reason =
    firstNonEmpty(
      raw.reason,
      raw["data[reason]"],
      raw["bounce_type"],
      raw["data[merge][reason]"],
      nestedReason
    ) ?? null;

  return { raw, type, email, reason };
}

function normalizeWebhookType(type: string | null, reason: string | null): string | null {
  if (!type) {
    return null;
  }

  const normalized = type.trim().toLowerCase();
  const normalizedReason = (reason ?? "").trim().toLowerCase();
  if (normalized === "unsubscribe") {
    return "unsubscribe";
  }

  if (normalized === "abuse") {
    return "abuse";
  }

  if (normalized === "bounce" && normalizedReason.includes("soft")) {
    return "soft_bounce";
  }

  if (normalized === "cleaned" || normalized === "bounce") {
    return "hard_bounce";
  }

  if (normalized === "soft_bounce" || normalized === "softbounce") {
    return "soft_bounce";
  }

  return normalized;
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function isSoftBounceActivity(activity: MailchimpEmailActivityEvent): boolean {
  const action = (activity.action ?? "").trim().toLowerCase();
  const type = (activity.type ?? "").trim().toLowerCase();

  return (
    action.includes("soft") ||
    type.includes("soft") ||
    (action.includes("bounce") && type === "soft")
  );
}

function validateEnv(env: Env): void {
  const missing = [
    "MAILCHIMP_API_KEY",
    "MAILCHIMP_SERVER_PREFIX",
    "MAILCHIMP_LIST_ID",
    "MAILCHIMP_WEBHOOK_SECRET"
  ].filter((key) => !env[key as keyof Env]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

function isAlreadyArchivedError(error: unknown): boolean {
  if (!(error instanceof MailchimpApiError)) {
    return false;
  }

  if (error.status === 404) {
    return true;
  }

  const detail = `${error.body.title ?? ""} ${error.body.detail ?? ""}`.toLowerCase();
  return detail.includes("resource not found") || detail.includes("is not a list member");
}

async function safeParseMailchimpError(response: Response): Promise<MailchimpErrorBody> {
  try {
    return (await response.json()) as MailchimpErrorBody;
  } catch {
    return {
      status: response.status,
      title: response.statusText,
      detail: "Unable to parse Mailchimp error response"
    };
  }
}

function getRetryDelayMs(response: Response, attempt: number): number {
  const retryAfterHeader = response.headers.get("retry-after");
  const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : Number.NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return retryAfterSeconds * 1000;
  }

  return Math.min(1000 * 2 ** attempt, 8000);
}

function log(event: string, data: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event,
      ...data
    })
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function getWebhookPath(env: Env): string {
  validateEnv(env);
  return `/mailchimp/webhook/${env.MAILCHIMP_WEBHOOK_SECRET}`;
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === "string" && value.trim().length > 0);
}

function stringifyWebhookValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value && typeof value === "object") {
    const candidate =
      (value as Record<string, unknown>).email ??
      (value as Record<string, unknown>).email_address ??
      (value as Record<string, unknown>).reason;
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

class MailchimpApiError extends Error {
  status: number;
  body: MailchimpErrorBody;
  url: string;

  constructor(status: number, body: MailchimpErrorBody, url: string) {
    super(body.detail ?? body.title ?? `Mailchimp API error ${status}`);
    this.name = "MailchimpApiError";
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

export { archiveMember, countSoftBounces, getCampaignEmailActivity, getSentCampaigns, subscriberHash };
