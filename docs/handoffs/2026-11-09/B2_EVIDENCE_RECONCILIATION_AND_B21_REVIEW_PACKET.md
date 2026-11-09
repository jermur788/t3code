# T3 Fork — B2 Evidence Reconciliation and B2.1 Read-Only Review Packet

**Authored:** 2026-11-09, ChatGPT Overall Manager
**Classification:** Browser-authored review/task handoff on the dedicated documentation branch. It is **not canonical Runtime state**, not a tested implementation, and not an adopted governing security architecture.
**Authority:** NO external connectivity, no public service, no account connection, no modification to active MCP/auth transport, no autonomous writes, no GitHub mainline integration. Integration HOLD and continuation default-off remain in force.

## 1. Evidence reconciliation: two local worker reports

These reports describe **different probes on the same local B2 checkout**; they are not contradictory test results.

**B2 native MCP/OAuth probe lane (first investigator):**
- Reports current T3 Streamable HTTP MCP handshake negotiates `2025-06-18`; initialization requires `Accept: application/json, text/event-stream`.
- Reports 38/38 existing MCP HTTP and OAuth tests passed, plus local disposable probes of initialize/session lifecycle, OAuth redirects, PKCE, authorization-code replay and 30-day tokens.
- Specifically did *not* test project-scoped external read-only authorization or callback Events delivery. Its probe files remain untracked in its checkout.
- No bridge Events compatibility verdict should be inferred from native HTTP/OAuth probes alone.

**B2 mock Events harness lane (second investigator):**
- Reports local-only, committed `apps/server/src/mcp/McpEventsCompat.b2.test.ts` (one added test file), 3/3 focused tests pass; lint/format/knip pass; typecheck shows no reported error in the file.
- Reports a thin **mock adapter** around the authenticated MCP endpoint can add the legacy `initialize` `events: {}` capability and intercept `events/*` without editing the existing T3 transport.
- Reports simulated external read-only client mutation denial, revoked-token rejection, project isolation via a **mock policy map**, callback validation, subscription idempotency, restart snapshot and deduplication.
- Important limitations: events wire schemas, webhook signatures, verification handshake and principal-to-project policy were **mock assumptions**; callback URL validation does not pin DNS at connect time; event deduplication does not survive restart; no live ChatGPT test.
- Test file is local and **not accessible to this browser review**. Its 3 passing tests and static checks are worker-reported and have not been independently rerun by GPT-6.

**Combined verdict:** `QUALIFIED PARTIAL / FEASIBLE WITH ADAPTER` for the **local simulated bridge architecture**. The native T3 MCP/OAuth path is locally runtime-qualified as reported. ChatGPT acceptance, real callbacks and production-grade project isolation remain **UNVERIFIED**. Not integrated.

## 2. Custody and one-writer enforcement

The two `B2Probe.*.test.ts` files were claimed by the first investigator. The committed `McpEventsCompat.b2.test.ts` was claimed by the second investigator, and the local commit's reported author trailer identifies another Sonnet session. Identity is still **not independently established**; custody can be tracked by *file/lane* without relying on process IDs or git author identity.

**Manager routing decision:** freeze the shared `qual/b2-chatgpt-bridge-20261109` worktree for all writes. Preserve both untracked probes and the committed Events harness. Do not delete, reset, stash, stage for an unrelated commit, or overwrite any of them. Both prior workers may read their artifacts. All additional B2 source work needs a **new isolated worktree and a single named writer**. Read-only inspection can use the current worktree if its status is checked first.

## 3. Exact protocol basis: OpenAI MCP Events as of 2026-11-09

Primary reference: https://developers.openai.com/plugins/build/mcp-events (current official specification, not the old mock assumptions).

- ChatGPT Events can use Streamable HTTP `initialize` with top-level `capabilities.events: {}`. MCP 2.0 and `server/discover` are **not required** for this experiment; current T3 doesn't advertise Events.
- `events/list` returns an `events` catalog with `name`, `description`, `delivery: ["webhook"]`, `inputSchema`, `payloadSchema` (and page cursor if applicable). Only expose events allowed for that authenticated principal.
- `events/subscribe` takes `name`, filter `arguments`, `delivery: {mode:"webhook", url, secret}`, and optional `cursor` or `ttlMs`. The `whsec_` secret must decode to 24–64 bytes. Return `id`, `refreshBefore`, `cursor`, `truncated`. Subscription identity is deterministic from verified principal + URL + name + canonical JSON arguments.
- `events/unsubscribe` identifies the original name, arguments and callback URL, not merely an arbitrary subscription ID.
- Before activation send a signed `{type:"verification",challenge:"..."}` webhook. Require a 2xx response containing the exact challenge; error `-32015` on failure. Callback requests use Standard Webhooks headers `webhook-id`, `webhook-timestamp`, `webhook-signature`, `X-MCP-Subscription-Id`.
- Deliver `{eventId,name,timestamp,data,cursor}` (data validated against payload schema). One event/request, maximum 256 KiB. Preserve event ID across bounded retries; refresh signatures and timestamp; avoid retries on 410/413.
- HTTPS only; resolve and validate public addresses **at connection time**; connect to validated IP while retaining original TLS hostname; reject redirects, local and non-public addresses. Revalidate on each request (including verification).
- Persist subscriptions and correct expiration/refresh behavior; revoke on client/session/project permission loss; external recipient dedupes using stable event IDs. No polling, streaming, `gap` or `terminated` notifications for ChatGPT integration.

The official docs describe events in ChatGPT Work or dots; individual account eligibility and live plugin registration **have not been verified** for this project.

## 4. Authorization gap (source inspected on current public fork main)

- Existing T3 external MCP client caller includes `sessionId`, `label`, `access`, but **no per-project grant** (`McpInvocationContext.ts`).
- `runtimeRead` uses `resolveRuntimeProjectId`; a standalone external client can supply a `projectId`. It is an explicit target, **not evidence of per-project permission** (`runtimeHandlers.ts`). This is suitable for T3's existing environment-level model but insufficient for a narrowly delegated bridge.
- Read-only client permissions and mutation denial exist in T3, but **do not imply per-project least privilege**.
- Mock policy maps and successful ping of a bearer token cannot establish production project authorization.

**Recommended but NOT adopted design:** an auth-domain durable grant that binds a verified MCP client session, a set of project IDs and allowed read-only operations; revalidate at event discovery, subscribe, delivery, and revocation. Identity continuity across reauthentication, integration ownership and the actual grant schema remain a PRODUCT/SECURITY DESIGN DECISION. A bridge must not proxy unrestricted existing MCP calls as a shortcut.

## 5. B2.1 bounded next task: independent review before more implementation

**TASK:** B2.1 exact wire-contract and local harness review.
**ROUTING:** Independent reviewer (prefer different model family where available) for the existing committed Events test; a least-cost implementation worker may build **new local-only contract fixtures** afterward if review accepts a safe isolated plan.
**BASE:** latest verified fork origin/main. A separate new worktree is required before any write. Existing B2 shared worktree stays frozen.
**SPEC:** this packet + official OpenAI MCP Events documentation + current Coordination/Handoff Protocol and Current State.
**GOAL:** identify which of the 3/3 mock tests actually match the official protocol; produce a precise gap matrix.
**SCOPE:**
1. Read-only inspect committed local Events harness and both untracked B2Probe tests; record custody without altering any source.
2. Compare `initialize`, events catalog, subscription, unsubscribe, challenge and signed-delivery shapes to official docs. Mark mock-only fields explicitly.
3. Confirm read-only mutation denial and **disprove any unsupported claim** of durable per-project authorization.
4. Evaluate test quality, simulated restart, revocation, receiver dedupe and DNS rebinding omissions; note that test pass alone is not live integration.
5. If purely fixture-only, non-overlapping follow-up is necessary, return its exact owned file list/acceptance test plan. Do **not** implement auth/adapter writes absent a governing approved design.
6. Append B2 evidence and review into the **restricted local ledger**, after checking current last entry and ledger ownership. Read-back required. If unavailable, return full handoff for manager persistence. Update Current State only if lane ownership confirmed.
**VERIFICATION:** independent static review of exact harness + command/test logs if available; do not claim fresh execution without a rerun. Privacy-scrub any traces.
**STOP:** any writer overlap, shared auth/transport change, public network endpoint, production credential, unknown project-grant security model, integration request, or material cost.
**HANDOFF:** VERDICT; BASE/CHECKPOINT; RESULT; VERIFICATION; FAILURES/RISKS; REVIEW; INTEGRATION STATE; NEXT. Exact review verdict only after source is actually read.

## 6. Coordination and publication boundaries

Canonical **local** resources (reported paths, not reachable by browser):
- Current State: `/home/jer/dev/planning-state-20261107/01_CURRENT_STATE.md`
- Coordination/Handoff Protocol: `/home/jer/dev/planning-state-20261107/02_COORDINATION_HANDOFF_PROTOCOL.md`
- Restricted ledger: `/home/jer/dev/overnight-20261107-evidence/LEDGER.md`

Do not assume a free ledger entry number; ENTRY 080 was last reported at 13:10. Check latest lines and concurrent writers.

This GitHub file is on the **documentation-only handoff branch of a public repository**. It intentionally contains no credential, trace, private ledger content, source code, or sensitive project artifact. Publication does not authorize PR/merge/release. GitHub doc provenance is supplementary to canonical Runtime/ledger state until read-back reconciles it.
