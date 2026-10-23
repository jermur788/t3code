import { expect, it } from "vite-plus/test";
import { runtimeErrorMessage } from "./ProjectRuntimeErrors";

it("shows actionable Runtime errors without exposing defect data", () => {
  for (const [_tag, word] of [
    ["ProjectRuntimeConflictError", "draft is preserved"],
    ["ProjectRuntimeDisabledError", "disabled"],
    ["ProjectRuntimeNotFoundError", "no longer available"],
    ["ProjectRuntimeSourcePathError", "workspace-relative"],
    ["ProjectRuntimeSourceMissingError", "missing"],
    ["ProjectRuntimeSourceUnsupportedError", "unreadable or unsupported"],
    ["EnvironmentAuthorizationError", "permission"],
  ] as const) {
    const message = runtimeErrorMessage({
      _tag,
      message: "SQL /internal/private-path",
      cause: { stack: "secret stack" },
    });
    expect(message).toContain(word);
    expect(message).not.toMatch(/SQL|private-path|secret stack/);
  }
  expect(runtimeErrorMessage({ _tag: "ProjectRuntimeRequestError", reason: "not_found" })).toBe(
    "This project is no longer available.",
  );
  expect(runtimeErrorMessage(new Error("SQL /internal/private-path"))).toBe(
    "Project Runtime could not complete the request. Check your connection and reload.",
  );
});
