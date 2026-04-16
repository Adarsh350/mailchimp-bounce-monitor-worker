# Graph Report - .  (2026-04-16)

## Corpus Check
- 6 files · ~7,921 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 47 nodes · 115 edges · 10 communities detected
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]

## God Nodes (most connected - your core abstractions)
1. `handleWebhook()` - 12 edges
2. `runSoftBounceReconciliation()` - 12 edges
3. `fetch()` - 11 edges
4. `log()` - 11 edges
5. `archiveMember()` - 9 edges
6. `buildDashboardPayload()` - 8 edges
7. `mailchimpRequest()` - 8 edges
8. `toErrorMessage()` - 8 edges
9. `normalizeEmail()` - 7 edges
10. `isWebhookConnected()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `fetch()` --calls--> `renderDashboardPage()`  [INFERRED]
  src/index.ts → src/dashboard.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.36
Nodes (10): archiveMember(), extractDomain(), handleWebhook(), isAlreadyArchivedError(), maskEmail(), normalizeEmail(), normalizeWebhookType(), recordAction() (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.48
Nodes (5): buildDashboardHealth(), buildDashboardMetrics(), buildDashboardPayload(), maskListId(), readHistory()

### Community 2 - "Community 2"
Cohesion: 0.47
Nodes (6): countSoftBounces(), getCampaignEmailActivity(), getListAbuseReports(), getSentCampaignCountSafely(), getSentCampaigns(), log()

### Community 3 - "Community 3"
Cohesion: 0.33
Nodes (6): getListWebhooks(), isWebhookConnected(), recordRun(), runScheduledReconciliation(), scheduled(), toErrorMessage()

### Community 4 - "Community 4"
Cohesion: 0.5
Nodes (4): firstNonEmpty(), isRecord(), parseWebhookPayload(), stringifyWebhookValue()

### Community 5 - "Community 5"
Cohesion: 0.5
Nodes (4): getRetryDelayMs(), mailchimpRequest(), safeParseMailchimpError(), sleep()

### Community 6 - "Community 6"
Cohesion: 0.5
Nodes (4): fetch(), htmlResponse(), jsonResponse(), safeEqual()

### Community 7 - "Community 7"
Cohesion: 1.0
Nodes (1): MailchimpApiError

### Community 8 - "Community 8"
Cohesion: 1.0
Nodes (2): getWebhookPath(), validateEnv()

### Community 9 - "Community 9"
Cohesion: 1.0
Nodes (1): renderDashboardPage()

## Knowledge Gaps
- **Thin community `Community 7`** (2 nodes): `MailchimpApiError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (2 nodes): `getWebhookPath()`, `validateEnv()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (2 nodes): `renderDashboardPage()`, `dashboard.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fetch()` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `renderDashboardPage()` connect `Community 9` to `Community 6`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `MailchimpApiError` connect `Community 7` to `Community 1`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._