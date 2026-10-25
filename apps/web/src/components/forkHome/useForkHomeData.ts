import type {
  EffectiveProjectInstructions,
  EnvironmentId,
  ProjectId,
  ProjectRuntimeHandoffListResult,
  ProjectRuntimeInstructions,
  ProjectRuntimeSourceListResult,
  ProjectRuntimeStatus,
  ProjectRuntimeTaskListResult,
} from "@t3tools/contracts";
import { useEffect, useState } from "react";

import { useStableCallback } from "../../hooks/useStableCallback";
import { useDevelopmentProfilesApi } from "../settings/useDevelopmentProfilesApi";
import { useProjectRuntimeApi, type RuntimeResult } from "../settings/useProjectRuntimeApi";
import type { ForkSection } from "./forkHome.logic";

export interface ForkRuntimeData {
  readonly status: ForkSection<ProjectRuntimeStatus>;
  readonly instructions: ForkSection<ProjectRuntimeInstructions | null>;
  readonly sources: ForkSection<ProjectRuntimeSourceListResult>;
  readonly tasks: ForkSection<ProjectRuntimeTaskListResult>;
  readonly handoffs: ForkSection<ProjectRuntimeHandoffListResult>;
}

const LOADING_RUNTIME: ForkRuntimeData = {
  status: { status: "loading" },
  instructions: { status: "loading" },
  sources: { status: "loading" },
  tasks: { status: "loading" },
  handoffs: { status: "loading" },
};

function toSection<A>(result: RuntimeResult<A>): ForkSection<A> {
  return result.ok
    ? { status: "ready", value: result.value }
    : { status: "unavailable", message: result.message };
}

function unavailableRuntime(message: string): ForkRuntimeData {
  return {
    status: { status: "unavailable", message },
    instructions: { status: "unavailable", message },
    sources: { status: "unavailable", message },
    tasks: { status: "unavailable", message },
    handoffs: { status: "unavailable", message },
  };
}

export function useForkHomeRuntime(target: {
  readonly environmentId: EnvironmentId;
  readonly projectId: ProjectId;
  readonly environmentLabel: string;
}) {
  const api = useProjectRuntimeApi({
    environmentId: target.environmentId,
    projectId: target.projectId,
  });
  const [data, setData] = useState<ForkRuntimeData>(LOADING_RUNTIME);

  const load = useStableCallback(async (ready: boolean, isActive: () => boolean = () => true) => {
    if (!ready) {
      if (isActive()) {
        setData(
          unavailableRuntime(`Connect ${target.environmentLabel} to read this project's Runtime.`),
        );
      }
      return;
    }
    setData(LOADING_RUNTIME);
    const [status, instructions, sources, tasks, handoffs] = await Promise.all([
      api.status(),
      api.readInstructions(),
      api.listSources({ limit: 100 }),
      api.listTasks({ limit: 100 }),
      api.listHandoffs({ limit: 100 }),
    ]);
    if (!isActive()) return;
    setData({
      status: toSection(status),
      instructions: toSection(instructions),
      sources: toSection(sources),
      tasks: toSection(tasks),
      handoffs: toSection(handoffs),
    });
  });

  useEffect(() => {
    let active = true;
    void load(api.ready, () => active);
    return () => {
      active = false;
    };
  }, [load, api.ready]);

  return { data, reload: () => load(api.ready) };
}

export function useForkHomeProfile(target: {
  readonly environmentId: EnvironmentId;
  readonly projectId: ProjectId;
  readonly environmentLabel: string;
}) {
  const api = useDevelopmentProfilesApi({ environmentId: target.environmentId });
  const [data, setData] = useState<ForkSection<EffectiveProjectInstructions>>({
    status: "loading",
  });

  const load = useStableCallback(async (ready: boolean, isActive: () => boolean = () => true) => {
    if (!ready) {
      if (isActive()) {
        setData({
          status: "unavailable",
          message: `Connect ${target.environmentLabel} to read this project's Development Profile.`,
        });
      }
      return;
    }
    setData({ status: "loading" });
    const resolved = await api.resolve(target.projectId);
    if (!isActive()) return;
    setData(
      resolved.ok
        ? { status: "ready", value: resolved.value }
        : { status: "unavailable", message: resolved.message },
    );
  });

  useEffect(() => {
    let active = true;
    void load(api.ready, () => active);
    return () => {
      active = false;
    };
  }, [load, api.ready]);

  return { data, reload: () => load(api.ready) };
}
