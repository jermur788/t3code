export function runtimeErrorMessage(error: unknown): string {
  const tag = typeof error === "object" && error !== null && "_tag" in error ? error._tag : "";
  switch (tag) {
    case "ProjectRuntimeConflictError":
      return "This record changed since you loaded it. Your draft is preserved. Reload the current record before saving again.";
    case "ProjectRuntimeDisabledError":
      return "Runtime is disabled. Enable it, then reload.";
    case "ProjectRuntimeNotFoundError":
    case "ProjectRuntimeProjectMismatchError":
      return "This Runtime record is no longer available in this project.";
    case "ProjectRuntimeSourcePathError":
      return "Use a safe workspace-relative path inside this checkout.";
    case "ProjectRuntimeSourceMissingError":
      return "The registered source is missing. Its registry record is preserved.";
    case "ProjectRuntimeSourceUnsupportedError":
      return "This source is unreadable or unsupported. Register a workspace text file.";
    case "ProjectRuntimeRequestError":
      return typeof error === "object" &&
        error !== null &&
        "reason" in error &&
        error.reason === "not_found"
        ? "This project is no longer available."
        : "The Runtime request could not be completed. Check the form values and reload.";
    case "EnvironmentAuthorizationError":
      return "This connection does not have permission to access Project Runtime.";
    default:
      return "Project Runtime could not complete the request. Check your connection and reload.";
  }
}
