/** Async sections exist only in Project Runtime and Development Profile settings. */
export function shouldSettleSettingsTarget(targetId: string): boolean {
  return targetId === "development-profile" || targetId.startsWith("project-runtime");
}
