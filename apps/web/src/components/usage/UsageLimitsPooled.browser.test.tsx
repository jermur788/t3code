import {
  EnvironmentId,
  ProviderDriverKind,
  ProviderInstanceId,
  type ServerProvider,
  UsageLimitSourceId,
} from "@t3tools/contracts";
import { CHATGPT_USAGE_URL } from "@t3tools/shared/usageLimits";
import { describe, expect, it } from "vite-plus/test";

import { render } from "../../../test/render";
import { UsageLimitsPooled } from "./UsageLimitsPooled";

const checkedAt = "2026-10-25T16:00:00.000Z";

function managedChatGpt(instanceId: string, displayName: string, email?: string): ServerProvider {
  return {
    instanceId: ProviderInstanceId.make(instanceId),
    driver: ProviderDriverKind.make("codex"),
    displayName,
    enabled: true,
    installed: true,
    version: "0.164.0",
    status: "ready",
    auth: { status: "authenticated", ...(email ? { email } : {}) },
    checkedAt,
    models: [],
    slashCommands: [],
    skills: [],
    usageLimits: {
      checkedAt,
      windows: [],
      unavailable: { reason: "unsupported", message: "Track usage in ChatGPT." },
      externalUsage: { label: "ChatGPT usage", url: CHATGPT_USAGE_URL },
    },
  };
}

describe("UsageLimitsPooled ChatGPT usage card", () => {
  it("names the managed connections it covers", async () => {
    const presentations = new Map([
      [
        EnvironmentId.make("desk"),
        {
          entry: { target: { label: "Desk" } },
          serverConfig: {
            providers: [
              managedChatGpt("chatgpt_work", "ChatGPT Work"),
              managedChatGpt("chatgpt_personal", "ChatGPT Personal"),
            ],
          },
        },
      ],
    ]);
    await using screen = await render(
      <UsageLimitsPooled presentations={presentations} now={Date.parse(checkedAt)} />,
    );

    await expect
      .element(screen.getByText("ChatGPT Work on Desk, ChatGPT Personal on Desk"))
      .toBeVisible();
    await expect
      .element(screen.getByText("View usage in ChatGPT with your connected account."))
      .toBeVisible();
  });

  it("names each Codex subscription beside its own bound capacity", async () => {
    const driver = ProviderDriverKind.make("codex");
    const presentations = new Map([
      [
        EnvironmentId.make("desk"),
        {
          entry: { target: { label: "Desk" } },
          serverConfig: {
            providers: [
              managedChatGpt("chatgpt_work", "Codex Work", "work@example.com"),
              managedChatGpt("chatgpt_personal", "Codex Personal", "personal@example.com"),
            ],
            usageLimitSources: [
              {
                id: UsageLimitSourceId.make("hub"),
                kind: "cliproxy" as const,
                label: "Accounts",
                checkedAt,
                accounts: [
                  {
                    id: "work",
                    driver,
                    email: "work@example.com",
                    plan: "ChatGPT Plus",
                    usageLimits: {
                      checkedAt,
                      windows: [
                        {
                          id: "five_hour",
                          kind: "session" as const,
                          label: "Session",
                          usedPercent: 40,
                          windowDurationMins: 300,
                          resetsAt: "2026-10-25T21:00:00.000Z",
                        },
                      ],
                    },
                  },
                  {
                    id: "personal",
                    driver,
                    email: "personal@example.com",
                    plan: "ChatGPT Pro",
                    usageLimits: {
                      checkedAt,
                      windows: [
                        {
                          id: "five_hour",
                          kind: "session" as const,
                          label: "Session",
                          usedPercent: 75,
                          windowDurationMins: 300,
                          resetsAt: "2026-10-25T22:00:00.000Z",
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    ]);
    await using screen = await render(
      <UsageLimitsPooled presentations={presentations} now={Date.parse(checkedAt)} />,
    );

    await expect.element(screen.getByText("Codex Work").first()).toBeVisible();
    await expect.element(screen.getByText("Codex Personal").first()).toBeVisible();
    await expect.element(screen.getByText("60%").first()).toBeVisible();
    await expect.element(screen.getByText("25%").first()).toBeVisible();
  });
});
