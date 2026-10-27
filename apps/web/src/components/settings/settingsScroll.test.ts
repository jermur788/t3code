import { describe, expect, it } from "vite-plus/test";

import { shouldSettleSettingsTarget } from "./settingsScroll.ts";

describe("shouldSettleSettingsTarget", () => {
  it("settles only the async Runtime and Profile targets", () => {
    for (const id of [
      "development-profile",
      "project-runtime",
      "project-runtime-instructions",
      "project-runtime-sources",
      "project-runtime-state",
      "project-runtime-tasks",
    ]) {
      expect(shouldSettleSettingsTarget(id)).toBe(true);
    }
    for (const id of ["general", "providers", "projects", "source-control", "storage"]) {
      expect(shouldSettleSettingsTarget(id)).toBe(false);
    }
  });
});
