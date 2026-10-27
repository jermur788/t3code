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

it("turns each invalid transition into guidance that names the required change", () => {
  for (const [violation, ...words] of [
    ["blocked_requires_blocker", "Blocked tasks need a blocker", "before saving"],
    ["blocker_requires_blocked_status", "blocked task", "Clear the blocker"],
    ["done_requires_result", "Done tasks need a result", "not a task result"],
    ["milestone_requires_passing_evidence", "passing evidence", "lower milestone"],
    ["verified_forbids_failing_evidence", "failing evidence", "another milestone"],
  ] as const) {
    const message = runtimeErrorMessage({
      _tag: "ProjectRuntimeInvalidTransitionError",
      violation,
      projectId: "project",
      taskId: "task",
    });
    for (const word of words) expect(message).toContain(word);
  }
  expect(
    runtimeErrorMessage({
      _tag: "ProjectRuntimeInvalidTransitionError",
      violation: "unknown_violation",
    }),
  ).toBe(
    "This task state is not valid. Review status, blocker, result, and verification before saving.",
  );
});
