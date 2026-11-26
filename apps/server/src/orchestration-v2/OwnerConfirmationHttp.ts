import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";
import { EnvironmentAuth } from "../auth/EnvironmentAuth.ts";
import { ServerConfig } from "../config.ts";
import { cardPath, localOwnerPrincipal, OwnerConfirmation } from "./OwnerConfirmationGrant.ts";
import { ThreadManagementService } from "./ThreadManagementService.ts";

const headers = {
  "cache-control": "no-store",
  "content-security-policy":
    "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });

export const isLocalOwnerRequest = (
  request: {
    readonly address: string | undefined;
    readonly host: string | undefined;
    readonly origin: string | undefined;
    readonly authorization: string | undefined;
    readonly method: string;
    readonly forwarded?: string | undefined;
  },
  port: number,
) => {
  const host = `127.0.0.1:${port}`;
  return (
    request.address === "127.0.0.1" &&
    request.host === host &&
    request.authorization === undefined &&
    request.forwarded === undefined &&
    (request.method === "GET" || request.origin === `http://${host}`)
  );
};

const unavailable = HttpServerResponse.text("Owner confirmation is unavailable.", {
  status: 404,
  headers,
});
const refused = HttpServerResponse.text("Owner confirmation was refused.", {
  status: 403,
  headers,
});
const conflict = HttpServerResponse.text(
  "The request could not be applied. Reopen the confirmation page.",
  { status: 409, headers },
);
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/u;

export const layer = Layer.unwrap(
  Effect.gen(function* () {
    const { service } = yield* OwnerConfirmation;
    if (service === undefined) return Layer.empty;
    const { port } = yield* ServerConfig;
    const auth = yield* EnvironmentAuth;
    const threads = yield* ThreadManagementService;
    const handle = Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      if (
        !isLocalOwnerRequest(
          {
            address: Option.getOrUndefined(request.remoteAddress),
            host: request.headers.host,
            origin: request.headers.origin,
            authorization: request.headers.authorization,
            method: request.method,
            forwarded:
              request.headers.forwarded ??
              request.headers["x-forwarded-for"] ??
              request.headers["x-forwarded-host"],
          },
          port,
        )
      )
        return unavailable;
      const session = yield* auth.authenticateHttpRequest(request).pipe(Effect.option);
      const owner = Option.isSome(session) ? localOwnerPrincipal(session.value) : undefined;
      if (owner === undefined) return refused;

      if (request.method === "GET") {
        const cards = yield* service.cards(owner);
        const content = cards
          .map((card) => {
            const action = (value: "confirm" | "revoke", label: string) =>
              `<button name="action" value="${value}">${label}</button>`;
            return `<section>
<h2>Delegation ${escapeHtml(card.id)}</h2>
<dl>
<dt>Parent thread</dt><dd>${escapeHtml(card.parentThreadId)}</dd>
<dt>Workspace root</dt><dd><code>${escapeHtml(card.root)}</code></dd>
<dt>Operations</dt><dd>${escapeHtml(card.operations.join(", "))}</dd>
<dt>Provider</dt><dd>Local Replay / ${escapeHtml(card.model)}</dd>
<dt>Runtime mode</dt><dd>Approval required</dd>
<dt>Expires</dt><dd>${DateTime.formatIso(DateTime.makeUnsafe(card.expiresAt))}</dd>
<dt>Status</dt><dd>${card.status}</dd>
${card.childThreadId === null ? "" : `<dt>Child thread</dt><dd>${escapeHtml(card.childThreadId)}</dd>`}
</dl>
<form method="post" action="${cardPath}">
<input type="hidden" name="id" value="${escapeHtml(card.id)}">
<input type="hidden" name="nonce" value="${escapeHtml(card.nonce)}">
${card.status === "pending" ? action("confirm", "Confirm this delegation") : ""}
${action("revoke", "Revoke")}
</form>
</section>`;
          })
          .join("\n");
        return HttpServerResponse.text(
          `<!doctype html><html lang="en"><meta charset="utf-8">
<title>Owner confirmations</title><main><h1>Owner confirmations</h1>
<p>Confirmation authorizes one local Replay dispatch. Any already-running operation may continue after revocation.</p>
${content || "<p>No open requests. Refresh after the agent requests a delegation.</p>"}</main></html>`,
          { headers, contentType: "text/html; charset=utf-8" },
        );
      }

      if (request.headers["content-type"]?.split(";", 1)[0] !== "application/x-www-form-urlencoded")
        return refused;
      const length = Number(request.headers["content-length"]);
      if (!Number.isSafeInteger(length) || length < 1 || length > 256) return refused;
      const body = new URLSearchParams(yield* request.text);
      const id = body.get("id");
      const nonce = body.get("nonce");
      const action = body.get("action");
      if (
        body.size !== 3 ||
        id === null ||
        !uuid.test(id) ||
        nonce === null ||
        !uuid.test(nonce) ||
        (action !== "confirm" && action !== "revoke")
      )
        return refused;
      yield* service.decision(owner, id, nonce, action, threads.dispatch);
      return HttpServerResponse.empty({ status: 303, headers: { ...headers, location: cardPath } });
    }).pipe(Effect.orElseSucceed(() => conflict));
    return Layer.merge(
      HttpRouter.add("GET", cardPath, handle),
      HttpRouter.add("POST", cardPath, handle),
    );
  }),
);
