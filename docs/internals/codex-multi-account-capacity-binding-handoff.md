# Codex Multi-Account Capacity Binding — Implementation Handoff

Date: 2026-10-31
Status: `SPECIFIED / IMPLEMENTATION PENDING / RUNTIME AUTH REPRODUCTION PENDING`

## VERDICT

`STATIC PASS` for archaeology/design only.

No implementation or runtime verification has been claimed.

## BASE / CHECKPOINT

Repository: `jermur788/t3code`

Parent integration branch when this task started:

`sync/upstream-20261031 @ f68e6078aa61f257fd29bbdf0c74c9103724230c`

Owned branch:

`fix/codex-multi-account-identity-20261031`

Governing spec commit:

`c84700e177053e170ddfed37217e834d88a5d90b`

Draft PR:

`#15 — runtime: bind Codex subscription capacity to provider instances`

Do not write on `sync/upstream-20261031` directly. Keep this task isolated on the owned branch.

## GOVERNING SPEC

Read first:

`docs/internals/codex-multi-account-capacity-binding-spec.md`

Also obey:

- `docs/internals/arm-v2-compatibility-evidence-gap-spec.md`
- `docs/internals/runtime-routing.md`

Core invariant:

**A direct provider instance remains the route/launch identity. A CLIProxyAPI account may supply capacity evidence for that instance only when the identity match is unambiguous. The hub is not the router.**

## CONFIRMED FINDINGS

### 1. Claude and managed Codex differ at the usage source

Claude's provider probe obtains account metadata and subscription usage for the concrete configured Claude instance.

Managed Codex deliberately creates an unsupported `usageLimits` snapshot with an external ChatGPT Usage link. It does not use the native Codex rate-limit probe for the managed ChatGPT-sharing path.

Relevant files:

- `apps/server/src/provider/ClaudeProvider.ts`
- `apps/server/src/provider/Drivers/CodexManagedProvider.ts`
- `apps/server/src/provider/CodexProvider.ts`

### 2. Provider identity itself is already separate

Managed ChatGPT credentials are stored per `ProviderInstanceId` through `ProviderCredentialStore.make(..., instanceId)`.

Provider instances therefore remain valid independent route targets. Do not create a second account catalog.

Relevant file:

- `apps/server/src/provider/CodexChatGptAuth.ts`

### 3. CLIProxy usage already has the account data needed

`UsageLimitSourceAccount` can contain:

- hub account id;
- driver;
- email;
- plan;
- workspace id;
- independent usage windows/reset times.

Relevant files:

- `packages/contracts/src/providerUsageLimits.ts`
- `apps/server/src/usage/cliproxyApi.ts`
- `apps/server/src/usage/UsageLimitSources.ts`

### 4. Existing identity resolver is the correct join primitive

`packages/shared/src/usageLimits.ts` already resolves account identity from:

- driver;
- normalized email;
- workspace id where known;
- credential fingerprint fallback where available.

It intentionally refuses to merge an email-only report when that email maps to multiple workspaces.

Reuse this behavior. Do not weaken ambiguity handling.

### 5. Exact missing behavior

`collectProviderUsageLimits(...)` deduplicates a hub account when a matching native provider has usable native limits.

But for managed Codex, native limits are unsupported. The matched hub usage therefore remains a separate hub-only row rather than becoming capacity evidence attached to the native `ProviderInstanceId`.

This is the principal implementation gap.

### 6. External ChatGPT usage presentation is not routing evidence

`collectExternalUsageLinks(...)` groups by external URL. Multiple managed ChatGPT connections therefore share the same ChatGPT Usage destination. Recent upstream code names the covered provider connections, but the link still does not provide account-specific machine-readable capacity.

Do not use this external-link aggregation as an Adaptive Routing capacity pool.

### 7. Auth-loss mechanism is not yet proven

Managed ChatGPT auth:

- persists access/refresh/ID token state per provider instance;
- refreshes without relying on browser cookies after OAuth completes;
- removes the active connection after OpenAI returns definitive refresh errors such as `invalid_grant`, `invalid_refresh_token`, `refresh_token_expired`, `refresh_token_invalidated`, or `refresh_token_reused`.

Therefore the user's browser being signed into account A can affect which account is chosen during interactive OAuth, but it does not by itself explain a previously valid account B refresh token being lost.

Runtime reproduction is required.

## IMPLEMENTATION TASK

### Lane A — reusable account-to-provider capacity binding

Refactor or extend `packages/shared/src/usageLimits.ts` so existing account identity rules can resolve a usage-source account to a concrete native provider instance when unambiguous.

Requirements:

1. same provider driver;
2. same resolved account key;
3. workspace ambiguity rules unchanged;
4. no binding for null/ambiguous identity;
5. exactly one logical native target for the matched key;
6. choose the freshest usable hub observation when multiple equivalent hub observations exist.

Prefer extracting a reusable pure helper rather than duplicating account matching in Runtime code.

### Lane B — provider-specific usage report

Update `collectProviderUsageLimits(...)`.

For each native provider/account row:

1. keep the native `ProviderInstanceId`, display name, accent, auth identity and route identity;
2. if native limits are usable, retain native limits as authoritative;
3. if native limits are unsupported/unusable and an unambiguous usable hub account matches, use that hub account's limits for the native row;
4. expose source provenance (`CLI Proxy` or equivalent existing field) when hub capacity is being displayed;
5. preserve/reset-credit redemption through the hub account when appropriate;
6. prevent the same bound hub account from also appearing as a duplicate hub-only row;
7. leave unmatched/ambiguous hub accounts as hub-only rows.

Do not alter Claude semantics.

### Lane C — Usage page account presentation

Verify `collectLimitAccounts(...)` and `UsageLimitsPooled` with two managed Codex instances plus two matching hub accounts.

Expected UX:

- both subscriptions remain individually visible/named;
- each account row carries its own capacity/reset values;
- a pooled Codex summary may remain, but the individual accounts cannot disappear into one averaged routing identity;
- native provider display names should be preferred when a hub account has been bound to a native provider identity.

If current account rows already satisfy this after Lane A/B, avoid unnecessary UI churn.

### Lane D — Runtime/ARM projection

Expose per-provider-instance capacity to Runtime/Adaptive Routing using existing provider state + existing `UsageLimitSources` state.

Preferred shape:

- read-only projection;
- keyed by `ProviderInstanceId`;
- includes selected limits and source provenance/quality;
- no new polling;
- no new account persistence;
- no launcher behavior.

A good seam is `RuntimeRoutingProviderView`, but inspect the current service/layer wiring before changing it.

The projection should allow future ARM evidence capture to say, for example:

```text
ProviderInstanceId: codex-work
capacity source: cliproxy/hub-account-X
session remaining: ...
weekly remaining: ...
```

without changing the launch target from `codex-work`.

### Lane E — sanitized auth diagnostics

In `CodexChatGptAuth.ts`, add safe local diagnostic evidence when OpenAI definitively rejects a refresh token.

Record only:

- `instanceId`;
- operation = `refresh`;
- normalized OAuth error code;
- timestamp through the normal logger.

Never log:

- access token;
- refresh token;
- ID token;
- authorization code;
- raw token response;
- subject/account opaque id unless already explicitly approved as non-sensitive telemetry.

Do not change the existing invalid-token removal behavior merely to keep a broken session alive.

Do not add undocumented OAuth parameters such as `prompt=select_account` unless current OpenAI documentation explicitly supports them for Sign in with ChatGPT.

### Lane F — reproduce secondary-account auth loss

With two managed Codex provider instances configured for two different ChatGPT accounts:

1. verify both provider snapshots report different intended account emails/labels;
2. restart T3 and confirm both credential stores remain connected;
3. allow/force access-token renewal for the secondary account;
4. capture the sanitized refresh outcome;
5. verify whether loss is:
   - wrong account selected during interactive OAuth;
   - refresh rejection/invalidation;
   - refresh-token reuse/race;
   - credential-store persistence failure;
   - profile replacement;
   - another implementation defect;
6. repeat with the browser currently active on the primary ChatGPT account to determine whether browser state affects only selection or actual token persistence.

Do not paste credentials into the handoff.

## FOCUSED TESTS TO ADD

At minimum in `packages/shared/src/usageLimits.test.ts`:

1. two Codex instances with distinct emails + two matching hub accounts -> one-to-one binding;
2. each native row retains its own `instanceId` and receives only its matching hub limits;
3. same email + distinct workspace ids + workspace-aware hub reports -> correct bindings;
4. same email + two native workspaces + email-only hub report -> hub remains unbound;
5. managed native `unsupported` + matched hub -> hub usage replaces only the capacity display/projection, not route identity;
6. native usable limits + matched hub -> native limits remain authoritative;
7. unmatched hub account remains hub-only;
8. no regression to existing Claude duplicate/merge tests.

Add Runtime/provider-view tests for the per-instance capacity projection.

Add/extend managed ChatGPT auth tests to prove sanitized refresh rejection classification without exposing token material.

## VERIFICATION

Run:

- affected shared package tests;
- affected server tests;
- managed Codex auth tests;
- Runtime Routing/provider-view tests;
- affected package typechecks;
- formatting/lint required by repo;
- rendered Usage inspection with two Codex provider instances + two hub accounts;
- restart/reload persistence;
- real two-account auth renewal reproduction if credentials permit.

## PROXY CONFIGURATION FOR QUALIFICATION

Use CLIProxyAPI as a **usage source** first.

The provider instances should still launch directly through their own managed ChatGPT connections during this qualification. This proves that proxy capacity telemetry can inform an explicit T3 route without letting the proxy secretly choose the execution account.

Do not enable proxy round-robin/fill-first as part of this task.

If direct auth for the second account proves fundamentally unreliable after diagnosis, return that evidence separately before changing transport architecture.

## STOP CONDITIONS

Stop for user/product decision only if:

- reliable capacity binding requires giving the proxy routing authority;
- OpenAI identity data cannot unambiguously distinguish the two intended subscriptions;
- fixing secondary auth requires materially replacing the accepted managed-auth architecture;
- a security trade-off requires retaining/logging sensitive credentials.

Routine implementation/test defects should be repaired automatically.

## REQUIRED RETURN HANDOFF

### VERDICT

Use the strongest evidenced state only.

### BASE / CHECKPOINT

Record starting and final SHA.

### RESULT

Describe binding behavior, Runtime projection, UI behavior and auth diagnosis.

### VERIFICATION

Exact commands/results plus rendered/restart evidence.

### AUTH REPRODUCTION

State the observed refresh failure classification without secrets.

### FAILURES / RISKS

Classify remaining blockers.

### INTEGRATION STATE

Expected successful task end:

`IMPLEMENTED + RUNTIME PASS ON PR #15 BRANCH / NOT MERGED TO sync OR main`

### NEXT

Independent review, then merge PR #15 into the qualified sync branch only after the upstream-sync integration lane is ready for the additional change.
