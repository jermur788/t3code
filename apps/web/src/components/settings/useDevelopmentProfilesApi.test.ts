import { describe, expect, it } from "vite-plus/test";

import { developmentProfileErrorMessage } from "./useDevelopmentProfilesApi";

const project = (name: string) => ({ projectId: `project-${name}`, name });

describe("development profile error messages", () => {
  it("names the projects blocking a delete", () => {
    expect(
      developmentProfileErrorMessage({
        _tag: "DevelopmentProfileInUseError",
        projects: [project("Storefront"), project("Admin")],
      }),
    ).toBe(
      "This profile is assigned to Storefront, Admin. Remove those assignments before deleting it.",
    );
  });

  it("bounds the project list and long names in a delete conflict", () => {
    const message = developmentProfileErrorMessage({
      _tag: "DevelopmentProfileInUseError",
      projects: [
        project("One"),
        project("Two"),
        project("Three"),
        project("Four"),
        project("Five"),
        project("Six"),
        project("Seven"),
      ],
    });
    expect(message).toBe(
      "This profile is assigned to One, Two, Three, Four, Five and 2 more projects. Remove those assignments before deleting it.",
    );

    const longName = "x".repeat(200);
    expect(
      developmentProfileErrorMessage({
        _tag: "DevelopmentProfileInUseError",
        projects: [project(longName)],
      }),
    ).toBe(
      `This profile is assigned to ${"x".repeat(59)}…. Remove those assignments before deleting it.`,
    );
  });

  it("does not show discard instructions for a profile that is no longer available", () => {
    expect(
      developmentProfileErrorMessage({
        _tag: "DevelopmentProfileNotFoundError",
        profileId: "profile-1",
      }),
    ).toBe("This profile is no longer available.");
  });

  it("explains that a draft is kept until the user discards it", () => {
    expect(
      developmentProfileErrorMessage({
        _tag: "DevelopmentProfileConflictError",
        entityId: "profile-1",
        expectedRevision: 1,
        currentRevision: 2,
      }),
    ).toBe(
      "This profile changed since you loaded it. Your draft is kept until you choose Discard draft and reload latest.",
    );
  });
});
