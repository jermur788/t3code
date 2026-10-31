# Codex Multi-Account Capacity Binding and Auth Diagnostics

Date: 2026-10-31
Status: GOVERNING SPEC FOR THIS BOUNDED FIX
Base: `sync/upstream-20261031 @ f68e6078aa61f257fd29bbdf0c74c9103724230c`

## 1. Problem

A project may configure multiple OpenAI/Codex subscription-backed provider instances. Those provider instances are independently selectable launch targets, but managed ChatGPT connections do not currently expose subscription limits on the native provider snapshot. The Usage surface therefore cannot provide the same per-provider-instance capacity signal that direct Claude instances provide.

This is a long-term routing problem: Adaptive Routing must be able to distinguish `Codex Work` from `Codex Personal`, observe each subscription's capacity separately, select one explicitly, and later prove which provider instance actually executed.

A second observed problem is that a secondary managed ChatGPT connection can require repeated reauthentication. That must be diagnosed independently from capacity presentation; browser login state is not canonical provider auth state after OAuth completes.

## 2. Current implementation truth

### Claude

Claude provider instances probe account metadata and subscription usage directly. Each configured provider instance can therefore carry its own `auth` identity and `usageLimits` snapshot.

### Managed Codex / ChatGPT sharing

Managed Codex stores ChatGPT OAuth credentials per provider instance and uses the saved refresh token after interactive OAuth completes. Its provider snapshot intentionally reports subscription usage as unsupported and links to ChatGPT Usage instead of probing native Codex rate limits.

The external ChatGPT Usage link is grouped by URL for presentation. That may be useful as a human shortcut, but it is not a routing identity and must not be used as an Adaptive Routing capacity pool.

### CLIProxyAPI usage source

T3 already supports CLIProxyAPI as a usage-limit source. A hub account can carry:

- a stable hub account id;
- provider driver;
- email when reported;
- ChatGPT account/workspace id when reported;
- plan label;
- independent usage windows/reset times;
- reset-credit state.

T3 already has account-key resolution that reconciles native provider reports and hub reports using driver + normalized email and, where available, workspace identity.

### Missing join

When a native provider has usable limits, duplicate hub usage can be deduplicated. When a managed Codex provider has unsupported native limits, the matching hub account remains a separate usage-source row instead of becoming capacity evidence for that concrete provider instance.

That is the compatibility gap addressed by this task.

## 3. Product requirements

1. Every configured Codex subscription provider instance remains an independently selectable route target.
2. Capacity belongs to a concrete account/provider-instance binding when that binding can be proven.
3. Human-facing pooled summaries may remain, but routing must never consume a provider-level averaged pool when individual subscription capacity is available.
4. A CLIProxyAPI hub may provide capacity/auth evidence without becoming the launch router.
5. The proxy must not silently choose which subscription executes a task unless the user explicitly configures a proxy provider route for that behavior.
6. Ambiguous account identity must remain unbound rather than guessed.
7. `recommendation != authorization`; launch eligibility remains checked by the normal provider/orchestration path.

## 4. Target topology

```text
Project Runtime Task
  -> Runtime route candidate
      -> ProviderInstanceId: Codex Work
          -> managed ChatGPT auth for Work
          -> capacity evidence
               native usage limits, when usable
               OR
               unambiguously matched CLIProxyAPI account snapshot

Project Runtime Task
  -> Runtime route candidate
      -> ProviderInstanceId: Codex Personal
          -> managed ChatGPT auth for Personal
          -> independent capacity evidence
```

The capacity source and launch transport are separate concerns.

## 5. Binding rule

Reuse T3's existing account identity semantics rather than inventing a fork-only account catalog.

A hub account may bind to a native provider instance only when all of the following hold:

1. provider driver matches;
2. the existing account-key resolver produces the same identity key;
3. workspace/account identity is not ambiguous;
4. exactly one logical native account is represented by that key for the relevant provider environment;
5. the hub snapshot is usable.

If multiple native workspaces share an email and the hub report omits workspace identity, do not bind.

If a hub account has neither a safe account key nor an unambiguous native match, keep it as a hub-only account.

## 6. Capacity precedence

For a bound provider instance:

1. Prefer a usable native provider snapshot when one exists.
2. Otherwise use the freshest usable bound hub snapshot.
3. Preserve hub reset-credit redemption information when it is fresher/available.
4. Preserve source provenance so Adaptive evidence can distinguish native provider observations from hub observations.
5. Never replace an unsupported/unknown state with an inferred exact value.

For managed Codex today, this normally means the matched hub snapshot supplies capacity while the native provider instance remains the route target.

## 7. Runtime / Adaptive Routing view

Expose per-provider-instance capacity to Runtime/Adaptive Routing as a read-only projection over existing provider state plus existing usage-limit sources.

The projection must not:

- create a second polling loop;
- create a second provider catalog;
- create a second launcher;
- persist a competing account graph.

ARM may capture immutable evidence from the resolved per-instance snapshot using the existing Adaptive capacity record/service.

## 8. Usage UI behavior

The Usage surface should preserve distinct account/provider-instance rows when capacity is known per subscription.

For two matched Codex instances, the user must be able to identify which limits correspond to `Codex Work` and which correspond to `Codex Personal`.

A provider-level pooled visualization may remain as a summary, but individual rows/segments must remain visible and named. The pool is a presentation aggregate, not the routing input.

When no per-account capacity source is available, keep the ChatGPT external-usage fallback and clearly name the connected provider instances; do not fabricate limits.

## 9. Auth-loss diagnosis

Managed ChatGPT OAuth credentials are stored per `ProviderInstanceId`; the browser session is only part of interactive authorization/reauthorization.

The runtime must preserve enough safe diagnostics to determine why the second connection is lost.

At minimum, on refresh rejection record locally:

- provider instance id;
- OAuth error code (`invalid_grant`, `refresh_token_reused`, etc.);
- operation (`refresh`);
- timestamp;
- no access token, refresh token, ID token, auth code, subject, or raw provider response.

Do not weaken the existing behavior that removes an invalid active token after OpenAI definitively rejects its refresh credential.

Reproduction should distinguish:

- the wrong ChatGPT account selected during interactive OAuth;
- refresh token rejection/invalidation;
- refresh-token reuse/race;
- credential-store persistence failure;
- profile replacement while a child session is active.

## 10. Proxy decision

CLIProxyAPI is approved as an optional usage/capacity source for this design.

It is not automatically approved as the routing owner for multiple Codex subscriptions.

Preferred initial setup for Adaptive Routing:

```text
Codex Work provider instance ----launch----> OpenAI Work connection
       |
       +----capacity binding----> hub Work account

Codex Personal provider instance --launch--> OpenAI Personal connection
       |
       +----capacity binding----> hub Personal account
```

If a future proxy configuration can pin a request to a specific upstream account with reliable executed-account provenance, that can be evaluated separately.

## 11. Implementation scope

### Required

1. Add a reusable provider-instance-to-usage-source binding projection using existing account identity rules.
2. Make provider-specific usage reports use matched hub limits when native limits are unavailable/unsupported.
3. Preserve native provider `instanceId`, display name, accent, and launch identity on the bound row.
4. Preserve source provenance and hub reset-credit redemption.
5. Expose the projection to Runtime/Adaptive Routing without adding a poller.
6. Add sanitized refresh-rejection diagnostics for managed ChatGPT auth.
7. Add focused tests for multi-Codex account binding and ambiguous identity.

### Deferred

- autonomous capacity-based routing policy;
- automatic subscription switching;
- proxy-controlled multi-account round-robin/fill-first routing;
- changing OAuth protocol parameters not documented by OpenAI;
- a new account database.

## 12. Acceptance tests

At minimum cover:

1. two Codex provider instances with distinct emails + two matching hub accounts -> each instance receives only its own hub capacity;
2. same email but distinct workspace ids + matching workspace-aware hub accounts -> correct one-to-one bindings;
3. same email across two workspaces + hub account without workspace id -> no guessed binding;
4. native usable limits + matching hub -> native usage remains authoritative while hub credits/provenance remain available as designed;
5. managed native unsupported limits + matching hub -> native provider row is retained with hub usage and native `instanceId`;
6. unmatched hub account -> remains hub-only;
7. Claude behavior remains unchanged;
8. refresh-token rejection logs only sanitized classification and instance identity;
9. Runtime provider view can read separate capacity for two Codex instances;
10. no recommendation or capacity observation can launch a provider by itself.

## 13. Verification

Required before integration:

- shared usage-limit unit tests;
- Runtime Routing/provider-view tests;
- managed Codex auth tests;
- typecheck for affected packages;
- rendered Usage inspection with two Codex instances and two hub accounts;
- restart/reload persistence check for provider identities/settings;
- a real reauth/refresh reproduction for the secondary account if credentials are available.

## 14. Status vocabulary

Use only the strongest evidenced state:

- `IMPLEMENTED`
- `STATIC PASS`
- `RUNTIME PASS`
- `REVIEW PASS`
- `INTEGRATED`
- `VERIFIED`
- `BLOCKED`

Browser-only code inspection is not runtime verification.
