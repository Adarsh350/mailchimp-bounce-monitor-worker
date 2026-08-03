# Graph Report - .  (2026-08-03)

## Corpus Check
- 8 files · ~7,780 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 106 nodes · 194 edges · 11 communities (9 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10

## God Nodes (most connected - your core abstractions)
1. `runSoftBounceReconciliation()` - 14 edges
2. `handleWebhook()` - 13 edges
3. `fetch()` - 11 edges
4. `log()` - 11 edges
5. `compilerOptions` - 11 edges
6. `archiveMember()` - 9 edges
7. `buildDashboardPayload()` - 8 edges
8. `mailchimpRequest()` - 8 edges
9. `toErrorMessage()` - 8 edges
10. `isWebhookConnected()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `fetch()` --calls--> `renderDashboardPage()`  [EXTRACTED]
  src/index.ts → src/dashboard.ts
- `ObservabilityRunRecord` --inherits--> `DashboardRunCard`  [EXTRACTED]
  src/index.ts → src/dashboard.ts
- `ObservabilityActionRecord` --inherits--> `DashboardActionCard`  [EXTRACTED]
  src/index.ts → src/dashboard.ts

## Import Cycles
- None detected.

## Communities (11 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.22
Nodes (19): archiveMember(), countSoftBounces(), extractDomain(), getCampaignEmailActivity(), getListAbuseReports(), getSentCampaignCountSafely(), getSentCampaigns(), handleWebhook() (+11 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (15): js-md5, dependencies, js-md5, description, devDependencies, typescript, wrangler, name (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (15): ES2022, src/**/*.ts, WebWorker, compilerOptions, allowSyntheticDefaultImports, esModuleInterop, isolatedModules, lib (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (15): buildDashboardHealth(), buildDashboardMetrics(), buildDashboardPayload(), fetch(), getListWebhooks(), getWebhookPath(), htmlResponse(), isWebhookConnected() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (13): Env, MailchimpAbuseReport, MailchimpAbuseReportsResponse, MailchimpCampaign, MailchimpCampaignsResponse, MailchimpEmailActivityEntry, MailchimpEmailActivityResponse, MailchimpErrorBody (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.29
Nodes (6): DashboardHealth, DashboardMetric, DashboardPayload, DashboardRunCard, renderDashboardPage(), ObservabilityRunRecord

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (4): getRetryDelayMs(), KVNamespaceLike, readHistory(), recordRun()

### Community 7 - "Community 7"
Cohesion: 0.50
Nodes (4): firstNonEmpty(), isRecord(), parseWebhookPayload(), stringifyWebhookValue()

### Community 9 - "Community 9"
Cohesion: 0.67
Nodes (3): DashboardActionCard, isSoftBounceActivity(), ObservabilityActionRecord

## Knowledge Gaps
- **34 isolated node(s):** `name`, `version`, `private`, `description`, `dev` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WorkerExecutionContext` connect `Community 8` to `Community 4`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `MailchimpApiError` connect `Community 10` to `Community 4`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._