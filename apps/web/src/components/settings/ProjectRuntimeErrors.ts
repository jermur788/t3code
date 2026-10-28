function invalidTransitionMessage(error: unknown): string {
  const violation =
    typeof error === "object" && error !== null && "violation" in error ? error.violation : null;
  switch (violation) {
    case "blocked_requires_blocker":
      return "Blocked tasks need a blocker summary. Add the blocker before saving, or choose another status.";
    case "blocker_requires_blocked_status":
      return "A blocker only applies to a blocked task. Clear the blocker or move the task back to blocked.";
    case "done_requires_result":
      return "Done tasks need a result. Add the result before saving; a handoff summary is not a task result.";
    case "milestone_requires_passing_evidence":
      return "That verification milestone needs at least one passing evidence item. Add passing evidence or choose a lower milestone.";
    case "verified_forbids_failing_evidence":
      return "Verified cannot coexist with failing evidence. Remove or resolve the failing evidence, or choose another milestone.";
    default:
      return "This task state is not valid. Review status, blocker, result, and verification before saving.";
  }
}

export function runtimeErrorMessage(error: unknown): string {
  const tag = typeof error === "object" && error !== null && "_tag" in error ? error._tag : "";
  switch (tag) {
    case "ProjectRuntimeConflictError":
      return "This record changed since you loaded it. Your draft is preserved. Reload the current record before saving again.";
    case "ProjectRuntimeRoutingConflictError":
      return "These worker settings changed since you loaded them. Your draft is preserved. Reload the latest worker settings before saving again.";
    case "RuntimeExecutionRejectedError":
      switch (
        typeof error === "object" && error !== null && "reason" in error ? error.reason : null
      ) {
        case "task_not_executable":
          return "This task cannot be executed in its current status.";
        case "route_unavailable":
          return "No saved worker route can currently be used for this task.";
        case "no_default_model":
          return "This project has no default model and no worker route selected one. Configure a worker preference first.";
        case "provider_disabled":
          return "The selected provider is currently unavailable or disabled for this project.";
        case "workspace_unavailable":
          return "The requested worktree base is not available for this project.";
        default:
          return "This task cannot be executed. Review its worker preference and project settings.";
      }
    case "RuntimeExecutionAttemptNotFoundError":
      return "This execution attempt is no longer available.";
    case "ProjectRuntimeDisabledError":
      return "Runtime is disabled. Enable it, then reload.";
    case "ProjectRuntimeInvalidTransitionError":
      return invalidTransitionMessage(error);
    case "ProjectRuntimeNotFoundError":
    case "ProjectRuntimeProjectMismatchError":
      return "This Runtime record is no longer available in this project.";
    case "ProjectRuntimeSourcePathError":
      return "Use a safe workspace-relative path inside this checkout.";
    case "ProjectRuntimeSourceMissingError":
      return "The registered source is missing. Its registry record is preserved.";
    case "ProjectRuntimeSourceUnsupportedError":
      return "This source is unreadable or unsupported. Register a workspace text file.";
    case "ProjectRuntimeRequestError": {
      const reason =
        typeof error === "object" && error !== null && "reason" in error ? error.reason : null;
      if (reason === "not_found") return "This project is no longer available.";
      if (reason === "invalid_request") {
        return "The Runtime request or saved record is not valid. Reload the record or review it in Runtime settings.";
      }
      return "The Runtime request could not be completed. Check the form values and reload.";
    }
    case "EnvironmentAuthorizationError":
      return "This connection does not have permission to access Project Runtime.";
    default:
      return "Project Runtime could not complete the request. Check your connection and reload.";
  }
}
