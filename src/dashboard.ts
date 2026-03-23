interface DashboardHealth {
  overall: "healthy" | "warning" | "critical";
  workerReachable: boolean;
  automationActive: boolean;
  webhookConnected: boolean;
  observabilityConnected: boolean;
  cronExpression: string;
  nextRunLabel: string;
  lastRunStatus: string;
  lastRunAt: string | null;
  lastRunDurationMs: number | null;
}

interface DashboardMetric {
  label: string;
  value: string;
  detail: string;
  tone: "primary" | "secondary" | "warning" | "danger" | "neutral";
}

interface DashboardRunCard {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  status: "success" | "failed";
  source: string;
  campaignsProcessed: number;
  emailsEvaluated: number;
  archivedCount: number;
  abuseArchivedCount: number;
  note: string;
}

interface DashboardActionCard {
  id: string;
  timestamp: string;
  channel: "scheduled" | "webhook";
  reason: string;
  status: "archived" | "already_archived" | "observed" | "failed";
  emailMasked: string | null;
  domain: string | null;
  detail: string;
}

interface DashboardPayload {
  generatedAt: string;
  headline: {
    title: string;
    eyebrow: string;
    description: string;
    audienceLabel: string;
  };
  health: DashboardHealth;
  metrics: DashboardMetric[];
  runs: DashboardRunCard[];
  actions: DashboardActionCard[];
}

export function renderDashboardPage(): string {
  const html: string[] = [];
  html.push(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Automation Observatory</title>
    <meta
      name="description"
      content="Presentation-grade dashboard for a Cloudflare Worker that automates Mailchimp bounce monitoring and list hygiene."
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        color-scheme: dark;
        --background: #0b1326;
        --surface: #131b2e;
        --surface-2: rgba(23, 31, 51, 0.82);
        --text: #dae2fd;
        --muted: #99a8cf;
        --line: rgba(123, 208, 255, 0.14);
        --primary: #7bd0ff;
        --secondary: #4edea3;
        --warning: #ffb95f;
        --danger: #ff8e84;
        --shadow: 0 28px 90px rgba(0, 0, 0, 0.34);
        --radius-xl: 28px;
        --max-width: 1380px;
      }

      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Inter", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 28%),
          radial-gradient(circle at top right, rgba(78, 222, 163, 0.12), transparent 24%),
          radial-gradient(circle at 50% 120%, rgba(255, 185, 95, 0.1), transparent 30%),
          linear-gradient(180deg, #091120 0%, #0b1326 28%, #09101f 100%);
      }

      .shell {
        width: min(var(--max-width), calc(100% - 32px));
        margin: 0 auto;
        padding: 24px 0 64px;
      }

      .topbar, .panel-title, .signal-band-top, .section-head, .timeline-top, .action-top {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
      }

      .topbar { margin-bottom: 20px; }
      .brand { display: flex; align-items: center; gap: 14px; }
      .brand-mark {
        width: 44px;
        height: 44px;
        border-radius: 16px;
        background: linear-gradient(140deg, rgba(123, 208, 255, 0.92), rgba(0, 138, 187, 0.72));
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1), 0 20px 45px rgba(56, 189, 248, 0.28);
        position: relative;
      }

      .brand-mark::before, .brand-mark::after {
        content: "";
        position: absolute;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.78);
      }

      .brand-mark::before { width: 22px; height: 2px; top: 13px; left: 11px; }
      .brand-mark::after { width: 2px; height: 22px; top: 11px; left: 21px; }
      .brand-copy h1, .hero-copy h2, .panel-title h3, .section-title, .timeline-card h4, .action-card h4, .explain-card h4 {
        font-family: "Space Grotesk", sans-serif;
      }

      .brand-copy h1 { margin: 0; font-size: 1rem; letter-spacing: 0.06em; text-transform: uppercase; }
      .brand-copy p, .hero-copy p, .section-copy, .meta-pair dt, .legend, .subtle, .footer-note, .empty-state, .topbar-actions span {
        color: var(--muted);
      }

      .topbar-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
      .ghost-button, .primary-button {
        border: 0;
        cursor: pointer;
        border-radius: 999px;
        padding: 12px 18px;
        font: inherit;
        transition: transform 180ms ease;
      }

      .ghost-button {
        background: rgba(19, 27, 46, 0.72);
        color: var(--text);
        box-shadow: inset 0 0 0 1px rgba(123, 208, 255, 0.08);
      }

      .primary-button {
        color: #04101b;
        font-weight: 800;
        background: linear-gradient(135deg, rgba(123, 208, 255, 0.96), rgba(0, 138, 187, 0.92));
        box-shadow: 0 18px 40px rgba(56, 189, 248, 0.26);
      }

      .ghost-button:hover, .primary-button:hover { transform: translateY(-1px); }
      .hero, .section-shell {
        border-radius: 36px;
        background: linear-gradient(160deg, rgba(19, 27, 46, 0.95), rgba(9, 16, 31, 0.88));
        box-shadow: var(--shadow);
      }

      .hero {
        position: relative;
        overflow: hidden;
        padding: 32px;
      }

      .hero::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 22% 22%, rgba(123, 208, 255, 0.2), transparent 0 32%),
          radial-gradient(circle at 82% 18%, rgba(78, 222, 163, 0.16), transparent 0 22%);
        z-index: 0;
      }

      .hero-grid, .content-grid, .metrics-grid, .meta-grid, .run-stats, .explain-grid {
        display: grid;
        gap: 18px;
      }

      .hero-grid { grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.95fr); position: relative; z-index: 1; }
      .hero-copy h2 {
        margin: 0;
        max-width: 12ch;
        font-size: clamp(2.9rem, 6vw, 5.25rem);
        line-height: 0.95;
        letter-spacing: -0.06em;
      }

      .eyebrow, .pill, .status-chip, .run-badge, .action-badge, .legend {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
      }

      .eyebrow { padding: 10px 14px; margin-bottom: 18px; text-transform: uppercase; letter-spacing: 0.08em; }
      .hero-copy p { margin: 18px 0 0; max-width: 62ch; line-height: 1.7; }
      .hero-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
      .pill, .status-chip, .run-badge, .action-badge, .legend { padding: 10px 14px; }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--primary);
        box-shadow: 0 0 18px currentColor;
      }

      .tone-primary { color: var(--primary); }
      .tone-secondary { color: var(--secondary); }
      .tone-warning { color: var(--warning); }
      .tone-danger { color: var(--danger); }

      .hero-side, .stack, .timeline-list, .action-list, .flow-list { display: grid; gap: 18px; }
      .panel, .metric-card, .timeline-card, .action-card, .explain-card {
        background: var(--surface-2);
        border-radius: var(--radius-xl);
        backdrop-filter: blur(14px);
        box-shadow: inset 0 0 0 1px var(--line);
      }

      .status-panel, .signal-band, .section-shell, .metric-card, .timeline-card, .action-card, .explain-card, .spark-card { padding: 22px; }
      .meta-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 18px; }
      .meta-pair { padding: 14px; border-radius: 18px; background: rgba(255, 255, 255, 0.03); }
      .meta-pair dt { margin-bottom: 6px; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; }
      .meta-pair dd { margin: 0; line-height: 1.45; }
      .signal-track { height: 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.06); overflow: hidden; }
      .signal-fill {
        height: 100%;
        width: 78%;
        border-radius: inherit;
        background: linear-gradient(90deg, rgba(123, 208, 255, 0.2), rgba(123, 208, 255, 0.95), rgba(78, 222, 163, 0.86));
      }

      .main-grid { display: grid; gap: 24px; margin-top: 26px; }
      .metrics-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .metric-card {
        min-height: 170px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .metric-label { color: var(--muted); font-size: 0.9rem; }
      .metric-value {
        margin-top: 18px;
        font-family: "Space Grotesk", sans-serif;
        font-size: clamp(2rem, 3vw, 2.8rem);
        letter-spacing: -0.06em;
      }

      .metric-detail { font-size: 0.95rem; line-height: 1.55; }
      .metric-bar { width: 72px; height: 6px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
      .metric-bar span { display: block; width: 58%; height: 100%; border-radius: inherit; background: currentColor; }
      .content-grid { grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); gap: 24px; }
      .section-shell { padding: 24px; }
      .section-kicker { margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--primary); font-size: 0.76rem; }
      .section-title { margin: 0; font-size: 1.08rem; letter-spacing: -0.03em; }
      .section-copy { max-width: 58ch; line-height: 1.65; }
      .timeline-card h4, .action-card h4, .explain-card h4 { margin: 0; font-size: 1rem; }
      .run-meta, .action-meta { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 10px; font-size: 0.85rem; color: var(--muted); }
      .run-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 14px; }
      .mini-stat { padding: 12px; border-radius: 16px; background: rgba(255, 255, 255, 0.03); }
      .mini-stat-label { color: var(--muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; display: block; }
      .mini-stat-value { margin-top: 8px; font-family: "Space Grotesk", sans-serif; font-size: 1.4rem; display: block; }
      .spark-wrap { margin-top: 18px; padding: 18px; border-radius: 24px; background: rgba(255, 255, 255, 0.035); }
      #sparkline { width: 100%; height: 120px; }
      .explain-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .explain-card p { margin: 10px 0 0; line-height: 1.7; color: var(--muted); }
      .flow-step {
        position: relative;
        padding: 16px 18px 16px 54px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.04);
      }

      .flow-step::before {
        content: attr(data-step);
        position: absolute;
        left: 18px;
        top: 16px;
        width: 24px;
        height: 24px;
        border-radius: 999px;
        background: rgba(123, 208, 255, 0.12);
        color: var(--primary);
        display: grid;
        place-items: center;
        font-size: 0.8rem;
        font-weight: 800;
      }

      .loading, .error-banner {
        padding: 18px;
        border-radius: 18px;
        margin-bottom: 18px;
      }

      .loading { background: rgba(123, 208, 255, 0.06); }
      .error-banner { display: none; background: rgba(255, 142, 132, 0.12); color: #ffd9d4; }
      .footer-note { margin-top: 24px; text-align: center; font-size: 0.92rem; }

      @media (max-width: 1180px) {
        .hero-grid, .content-grid { grid-template-columns: 1fr; }
        .metrics-grid, .explain-grid, .run-stats { grid-template-columns: 1fr 1fr; }
      }

      @media (max-width: 760px) {
        .shell { width: min(100% - 18px, var(--max-width)); padding-top: 16px; }
        .topbar, .section-head, .timeline-top, .action-top, .signal-band-top { flex-direction: column; align-items: start; }
        .hero, .section-shell { padding: 20px; border-radius: 24px; }
        .metrics-grid, .meta-grid, .run-stats, .explain-grid { grid-template-columns: 1fr; }
        .hero-copy h2 { font-size: 2.8rem; }
      }
    </style>
  </head>
  <body>`);
  html.push(`<div class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark" aria-hidden="true"></div>
          <div class="brand-copy">
            <h1>Automation Observatory</h1>
            <p>AI automation dashboard for your Mailchimp hygiene Worker.</p>
          </div>
        </div>
        <div class="topbar-actions">
          <span id="updated-at">Preparing live system snapshot…</span>
          <button class="ghost-button" id="auto-refresh-toggle" type="button">Auto refresh on</button>
          <button class="primary-button" id="refresh-button" type="button">Refresh now</button>
        </div>
      </header>

      <main>
        <div class="loading" id="loading-state">Fetching the latest worker state, run history, and action log…</div>
        <div class="error-banner" id="error-banner"></div>

        <section class="hero">
          <div class="hero-grid">
            <div class="hero-copy">
              <div class="eyebrow"><span class="dot tone-primary"></span>Presentation-grade automation command center</div>
              <h2 id="headline-title">Mailchimp bounce hygiene, visualized like mission control.</h2>
              <p id="headline-description">A live view into the Worker’s health, its most recent autonomous runs, and the system logic behind each archive decision.</p>
              <div class="hero-meta">
                <div class="pill"><span class="dot tone-secondary"></span><span id="audience-label">Audience snapshot loading</span></div>
                <div class="pill"><span class="dot tone-primary"></span><span id="schedule-label">Daily run schedule loading</span></div>
                <div class="pill"><span class="dot tone-warning"></span><span id="last-run-label">Last run loading</span></div>
              </div>
            </div>
            <div class="hero-side">
              <section class="panel status-panel">
                <div class="panel-title">
                  <h3>System health</h3>
                  <div class="status-chip" id="overall-chip"><span class="dot tone-primary"></span><span>Checking</span></div>
                </div>
                <div class="meta-grid" id="health-grid"></div>
              </section>
              <section class="panel signal-band">
                <div class="signal-band-top">
                  <div>
                    <p class="section-kicker">Automation confidence</p>
                    <h3 class="section-title">Worker + webhook + cron posture</h3>
                  </div>
                  <div class="legend" id="confidence-label">Awaiting signal synthesis</div>
                </div>
                <div class="signal-track"><div class="signal-fill" id="signal-fill"></div></div>
                <p class="section-copy" id="confidence-copy">This score reflects whether the Worker is reachable, the Mailchimp webhook is aligned to the secure endpoint, the cron is active, and run history is being captured.</p>
              </section>
            </div>
          </div>
        </section>

        <div class="main-grid">
          <section class="metrics-grid" id="metrics-grid"></section>
          <div class="content-grid">
            <div class="stack">
              <section class="section-shell">
                <div class="section-head">
                  <div>
                    <p class="section-kicker">Execution history</p>
                    <h3 class="section-title">What the automation has been doing each run</h3>
                  </div>
                  <p class="section-copy">Each scheduled reconciliation records timing, campaigns scanned, evaluated recipients, and archive volume so you can show real operational evidence instead of screenshots.</p>
                </div>
                <div class="timeline-list" id="run-list"></div>
              </section>

              <section class="section-shell">
                <div class="section-head">
                  <div>
                    <p class="section-kicker">System explainer</p>
                    <h3 class="section-title">How the automation works</h3>
                  </div>
                </div>
                <div class="explain-grid">
                  <article class="explain-card">
                    <h4>Immediate event handling</h4>
                    <p>Mailchimp webhooks call the secure Worker endpoint as soon as an unsubscribe, hard bounce, or abuse signal appears. The Worker normalizes the address and archives the contact idempotently.</p>
                  </article>
                  <article class="explain-card">
                    <h4>Soft bounce reconciliation</h4>
                    <p>Soft bounces are intentionally counted at the campaign level. The daily run re-reads Mailchimp email activity across all sent campaigns and archives any address that has soft-bounced in three or more campaigns lifetime.</p>
                  </article>
                  <article class="explain-card">
                    <h4>No brittle manual cleanup</h4>
                    <p>The workflow keeps deliverability hygiene running without a server, queue worker, or manual review loop. Cloudflare handles execution, Mailchimp remains the source of truth, and the dashboard explains the result.</p>
                  </article>
                  <article class="explain-card">
                    <h4>Presentation-safe observability</h4>
                    <p>Recent actions are masked before they are shown here. You get proof of automation and reasons behind decisions without exposing private customer addresses in client-facing demos.</p>
                  </article>
                </div>
              </section>
            </div>`);
  html.push(`<div class="stack">
              <section class="section-shell spark-card">
                <div class="section-head">
                  <div>
                    <p class="section-kicker">Velocity view</p>
                    <h3 class="section-title">Archive activity trend</h3>
                  </div>
                  <div class="legend" id="spark-summary">Waiting for run data</div>
                </div>
                <div class="spark-wrap">
                  <svg id="sparkline" viewBox="0 0 600 120" preserveAspectRatio="none" aria-label="Archive activity trend"></svg>
                </div>
              </section>

              <section class="section-shell">
                <div class="section-head">
                  <div>
                    <p class="section-kicker">Recent actions</p>
                    <h3 class="section-title">Autonomous decisions the Worker has taken</h3>
                  </div>
                  <p class="section-copy">Useful in portfolio walkthroughs to show the system is actively making hygiene decisions, not just sitting deployed.</p>
                </div>
                <div class="action-list" id="action-list"></div>
              </section>

              <section class="section-shell">
                <div class="section-head">
                  <div>
                    <p class="section-kicker">Architecture</p>
                    <h3 class="section-title">From signal to archive action</h3>
                  </div>
                </div>
                <div class="flow-list">
                  <div class="flow-step" data-step="1">Mailchimp emits real-time audience events and campaign report data for the configured list.</div>
                  <div class="flow-step" data-step="2">The Cloudflare Worker receives immediate webhook events and runs a daily reconciliation on schedule.</div>
                  <div class="flow-step" data-step="3">Every archive decision is idempotent, retried on transient Mailchimp failures, and logged into the observability layer for this dashboard.</div>
                </div>
              </section>
            </div>
          </div>
        </div>

        <p class="footer-note">Built for client presentations, portfolio walkthroughs, and day-to-day operational confidence.</p>
      </main>
    </div>`);
  html.push(`<script>
      const state = { autoRefresh: true, refreshHandle: null };
      const els = {
        loading: document.getElementById("loading-state"),
        error: document.getElementById("error-banner"),
        updatedAt: document.getElementById("updated-at"),
        headlineTitle: document.getElementById("headline-title"),
        headlineDescription: document.getElementById("headline-description"),
        audienceLabel: document.getElementById("audience-label"),
        scheduleLabel: document.getElementById("schedule-label"),
        lastRunLabel: document.getElementById("last-run-label"),
        overallChip: document.getElementById("overall-chip"),
        healthGrid: document.getElementById("health-grid"),
        confidenceLabel: document.getElementById("confidence-label"),
        confidenceCopy: document.getElementById("confidence-copy"),
        signalFill: document.getElementById("signal-fill"),
        metricsGrid: document.getElementById("metrics-grid"),
        runList: document.getElementById("run-list"),
        actionList: document.getElementById("action-list"),
        sparkline: document.getElementById("sparkline"),
        sparkSummary: document.getElementById("spark-summary"),
        refreshButton: document.getElementById("refresh-button"),
        autoRefreshToggle: document.getElementById("auto-refresh-toggle")
      };

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function formatDateTime(value) {
        if (!value) return "Not yet recorded";
        return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
      }

      function formatDistance(value) {
        if (!value) return "No runs yet";
        const diff = Date.now() - new Date(value).getTime();
        if (!Number.isFinite(diff) || diff < 0) return "Just now";
        const minutes = Math.round(diff / 60000);
        if (minutes < 1) return "Just now";
        if (minutes < 60) return minutes + " min ago";
        const hours = Math.round(minutes / 60);
        if (hours < 24) return hours + " hr ago";
        const days = Math.round(hours / 24);
        return days + " day" + (days === 1 ? "" : "s") + " ago";
      }

      function toneClass(tone) { return "tone-" + tone; }

      function setToneChip(element, tone, label) {
        element.innerHTML = '<span class="dot ' + toneClass(tone) + '"></span><span>' + escapeHtml(label) + '</span>';
      }

      function computeConfidence(health) {
        let score = 40;
        if (health.workerReachable) score += 15;
        if (health.automationActive) score += 15;
        if (health.webhookConnected) score += 15;
        if (health.observabilityConnected) score += 15;
        if (health.lastRunStatus === "success") score += 10;
        return Math.min(100, score);
      }

      function renderHealthGrid(health) {
        const rows = [
          ["Worker reachability", health.workerReachable ? "Live and responding" : "Unavailable"],
          ["Cron schedule", health.nextRunLabel],
          ["Webhook alignment", health.webhookConnected ? "Secure Mailchimp webhook connected" : "Webhook attention needed"],
          ["Last successful run", health.lastRunAt ? formatDateTime(health.lastRunAt) : "Waiting for first recorded run"],
          ["Last run duration", health.lastRunDurationMs ? Math.round(health.lastRunDurationMs / 1000) + " sec" : "Not recorded yet"],
          ["Observability log", health.observabilityConnected ? "Run history persistence active" : "Limited to live health only"]
        ];
        els.healthGrid.innerHTML = rows.map(([term, value]) => '<dl class="meta-pair"><dt>' + escapeHtml(term) + '</dt><dd>' + escapeHtml(value) + '</dd></dl>').join("");
      }

      function renderMetrics(metrics) {
        els.metricsGrid.innerHTML = metrics.map((metric) =>
          '<article class="metric-card ' + toneClass(metric.tone) + '">' +
            '<div><div class="metric-bar"><span></span></div><div class="metric-label">' + escapeHtml(metric.label) + '</div></div>' +
            '<div class="metric-value">' + escapeHtml(metric.value) + '</div>' +
            '<div class="metric-detail subtle">' + escapeHtml(metric.detail) + '</div>' +
          '</article>'
        ).join("");
      }

      function renderRuns(runs) {
        if (!runs.length) {
          els.runList.innerHTML = '<div class="empty-state">Run history will appear here after the next scheduled reconciliation completes.</div>';
          return;
        }
        els.runList.innerHTML = runs.map((run) => {
          const tone = run.status === "success" ? "secondary" : "danger";
          const label = run.status === "success" ? "Completed" : "Failed";
          return '<article class="timeline-card">' +
            '<div class="timeline-top">' +
              '<div>' +
                '<h4>' + escapeHtml(run.note || "Daily reconciliation cycle") + '</h4>' +
                '<div class="run-meta">' +
                  '<span>' + escapeHtml(formatDateTime(run.startedAt)) + '</span>' +
                  '<span>' + escapeHtml(run.durationMs ? Math.round(run.durationMs / 1000) + " sec" : "In progress") + '</span>' +
                  '<span>' + escapeHtml(run.source) + '</span>' +
                '</div>' +
              '</div>' +
              '<div class="run-badge"><span class="dot ' + toneClass(tone) + '"></span><strong>' + escapeHtml(label) + '</strong></div>' +
            '</div>' +
            '<div class="run-stats">' +
              '<div class="mini-stat"><span class="mini-stat-label">Campaigns</span><span class="mini-stat-value">' + escapeHtml(String(run.campaignsProcessed)) + '</span></div>' +
              '<div class="mini-stat"><span class="mini-stat-label">Evaluated</span><span class="mini-stat-value">' + escapeHtml(String(run.emailsEvaluated)) + '</span></div>' +
              '<div class="mini-stat"><span class="mini-stat-label">Archived</span><span class="mini-stat-value">' + escapeHtml(String(run.archivedCount)) + '</span></div>' +
              '<div class="mini-stat"><span class="mini-stat-label">Abuse</span><span class="mini-stat-value">' + escapeHtml(String(run.abuseArchivedCount)) + '</span></div>' +
            '</div>' +
          '</article>';
        }).join("");
      }

      function renderActions(actions) {
        if (!actions.length) {
          els.actionList.innerHTML = '<div class="empty-state">Recent actions will appear after webhook events or the next scheduled run.</div>';
          return;
        }
        els.actionList.innerHTML = actions.map((action) => {
          const tone = action.status === "failed" ? "danger" : action.status === "archived" ? "secondary" : action.status === "already_archived" ? "warning" : "primary";
          return '<article class="action-card">' +
            '<div class="action-top">' +
              '<div>' +
                '<h4>' + escapeHtml(action.detail) + '</h4>' +
                '<div class="action-meta">' +
                  '<span>' + escapeHtml(formatDateTime(action.timestamp)) + '</span>' +
                  '<span>' + escapeHtml(action.channel) + '</span>' +
                  '<span>' + escapeHtml(action.reason) + '</span>' +
                '</div>' +
              '</div>' +
              '<div class="action-badge"><span class="dot ' + toneClass(tone) + '"></span><strong>' + escapeHtml(action.status.replaceAll("_", " ")) + '</strong></div>' +
            '</div>' +
            '<div class="action-domain">' + escapeHtml(action.emailMasked || "No email exposed") + (action.domain ? ' · ' + escapeHtml(action.domain) : '') + '</div>' +
          '</article>';
        }).join("");
      }

      function renderSparkline(runs) {
        if (!runs.length) {
          els.sparkline.innerHTML = "";
          els.sparkSummary.textContent = "Run history needed";
          return;
        }
        const points = runs.slice(0, 8).reverse();
        const values = points.map((run) => run.archivedCount);
        const max = Math.max(...values, 1);
        const width = 600;
        const height = 120;
        const gap = width / Math.max(points.length - 1, 1);
        const coords = points.map((run, index) => {
          const x = index * gap;
          const y = height - (run.archivedCount / max) * 90 - 12;
          return { x, y, run };
        });
        const line = coords.map((point) => point.x + "," + point.y).join(" ");
        const dots = coords.map((point) => '<circle cx="' + point.x + '" cy="' + point.y + '" r="5" fill="#7bd0ff"><title>' + escapeHtml(formatDateTime(point.run.startedAt) + " · " + point.run.archivedCount + " archived") + '</title></circle>').join("");
        const area = "0,120 " + line + " 600,120";
        els.sparkline.innerHTML = '<polygon points="' + area + '" fill="rgba(123,208,255,0.12)"></polygon><polyline points="' + line + '" fill="none" stroke="#7bd0ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>' + dots;
        const total = values.reduce((sum, value) => sum + value, 0);
        els.sparkSummary.textContent = total + " total archives across the latest " + points.length + " recorded runs";
      }

      function renderDashboard(payload) {
        const health = payload.health;
        const confidence = computeConfidence(health);
        els.headlineTitle.textContent = payload.headline.title;
        els.headlineDescription.textContent = payload.headline.description;
        els.audienceLabel.textContent = payload.headline.audienceLabel;
        els.scheduleLabel.textContent = "Cron " + health.cronExpression + " · " + health.nextRunLabel;
        els.lastRunLabel.textContent = health.lastRunAt ? "Last run " + formatDistance(health.lastRunAt) : "Awaiting first recorded run";
        els.updatedAt.textContent = "Last refreshed " + formatDateTime(payload.generatedAt);
        const chipTone = health.overall === "healthy" ? "secondary" : health.overall === "warning" ? "warning" : "danger";
        setToneChip(els.overallChip, chipTone, health.overall.toUpperCase());
        renderHealthGrid(health);
        renderMetrics(payload.metrics);
        renderRuns(payload.runs);
        renderActions(payload.actions);
        renderSparkline(payload.runs);
        els.confidenceLabel.textContent = confidence + "% confidence";
        els.signalFill.style.width = confidence + "%";
        els.confidenceCopy.textContent = health.overall === "healthy"
          ? "The automation is reachable, the Mailchimp webhook is aligned, and the Worker is recording operational history for this presentation dashboard."
          : health.overall === "warning"
            ? "The automation is reachable, but one or more supporting signals needs attention. Review the health panel before a client presentation."
            : "The automation needs intervention before it should be presented as healthy.";
      }

      async function loadDashboard() {
        els.error.style.display = "none";
        try {
          const response = await fetch("/api/dashboard", { headers: { Accept: "application/json" } });
          if (!response.ok) throw new Error("Dashboard API returned " + response.status);
          const payload = await response.json();
          renderDashboard(payload);
        } catch (error) {
          els.error.textContent = "Unable to load dashboard data right now. " + (error instanceof Error ? error.message : String(error));
          els.error.style.display = "block";
        } finally {
          els.loading.style.display = "none";
        }
      }

      function setAutoRefresh(enabled) {
        state.autoRefresh = enabled;
        els.autoRefreshToggle.textContent = enabled ? "Auto refresh on" : "Auto refresh off";
        if (state.refreshHandle) clearInterval(state.refreshHandle);
        state.refreshHandle = enabled ? setInterval(loadDashboard, 60000) : null;
      }

      els.refreshButton.addEventListener("click", loadDashboard);
      els.autoRefreshToggle.addEventListener("click", () => setAutoRefresh(!state.autoRefresh));
      setAutoRefresh(true);
      loadDashboard();
    </script>
  </body>
</html>`);
  return html.join("");
}

export type {
  DashboardActionCard,
  DashboardHealth,
  DashboardMetric,
  DashboardPayload,
  DashboardRunCard
};
