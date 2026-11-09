# T3 Fork — B2 ChatGPT Bridge Compatibility Research Note

**Date:** 2026-11-09  
**Classification:** Browser research / static inspection only; **not** a live connectivity test or approved source change.  
**Mainline and external writes:** HOLD; no public endpoint, ChatGPT subscription, account changes, or automation initiated.

## Correction to prior draft

The original `01_OPERATOR_AUTONOMY_RESEARCH_AND_SPEC_DRAFT.md` says ChatGPT MCP Events requires MCP 2.0. This is **outdated**. OpenAI's [current MCP Events documentation](https://developers.openai.com/plugins/build/mcp-events) explicitly supports:

1. **MCP Events over Streamable HTTP with `initialize`** (legacy MCP protocol path): advertise `events: {}` in the `initialize` response capabilities.
2. **MCP 2.0 HTTP** (version `2026-07-28`): advertise `events: {}` in `server/discover`.

**Implication:** Do not require an MCP 2.0 upgrade as a prerequisite. Test the existing T3 Streamable HTTP `initialize`/auth path before proposing transport changes.

## Inspected T3 source (public fork main)

- `apps/server/src/mcp/McpHttpServer.ts` uses Effect's MCP HTTP server, an authenticated bearer-token middleware, and optional `McpClientAuthenticator` for externally authenticated MCP clients. It already challenges eligible clients with OAuth protected-resource metadata when appropriate.
- `apps/server/src/mcp/McpInvocationContext.ts` distinguishes provider-issued thread/session scope from separately authenticated MCP clients; the client carries an access level.
- `apps/server/src/mcp/McpToolAccess.ts` rejects mutation for `read-only` external clients. Actual resource/project authorization still needs per-operation proof.
- `apps/server/src/mcp/toolkits/project/runtimeTools.ts` already defines Runtime read operations, but A0 is intentionally **not registered as a tool**. A narrow read-only operator façade can be designed without exposing all internal project data.

**What is not established by source inspection:** The exact current protocol-version handshake; whether the Effect MCP server can extend `initialize` capabilities with Events and route `events/list|subscribe|unsubscribe` without modifying upstream-heavy transport code; actual ChatGPT plugin credentials/account entitlements; event delivery/restart behavior.

## Minimal browser/T3 split

**Browser-completable now:** document read-tool schemas, event definitions, least-privilege project scoping, response-size limits, authentication threat model and protocol test fixtures. Do not implement source changes in a browser branch until file ownership and integration safety are confirmed.

**Needs T3 local tests:**

1. Run actual MCP `initialize` on a disposable loopback server and record negotiated protocol version and advertised capabilities.
2. Authenticate as an **external read-only client**, not a T3 provider session. Verify project restriction and mutation denial.
3. Test a fake Events advertisement plus `events/list`, `events/subscribe`, `events/unsubscribe` in an isolated harness. If the current library does not allow it, return an additive adapter plan and compatibility verdict rather than editing the shared MCP HTTP server in this lane.
4. Test callback URL verification and rejection of private/local IPs, redirects, expired/revoked sessions, replays and cross-project filters, with mock callbacks only.
5. Test subscription persistence/restart and idempotent delivery if implementing the event prototype. No actual ChatGPT subscription is claimed.

**OpenAI protocol specifics to preserve:** webhook-only delivery for this ChatGPT Events integration; HTTPS callbacks; signed challenge/verification; bounded delivery with retries and dedupe; per-principal subscriptions; no supported polling/streaming/gap/terminated control notifications in ChatGPT's current event integration.

## Feasibility verdict

**STATIC FEASIBILITY: plausible for an additive Streamable HTTP Events extension.** No actual protocol negotiation or authenticated ChatGPT event-delivery test has been performed. Mark runtime compatibility **UNVERIFIED**, and live ChatGPT end-to-end support **UNVERIFIED** until independently demonstrated.

**Next:** carry the correction into any canonical B2 governing spec; execute the isolated local protocol/auth test packet without changing existing integration/security files. Preserve one writer per lane and fork-main HOLD.