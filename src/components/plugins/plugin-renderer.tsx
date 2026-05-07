import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getEnabledPluginsForAnchor, runPluginHook } from "@/lib/dal/plugins";

import { PluginWidget } from "./widgets";

type PluginProposal = {
  proposalType: string;
  payload: Record<string, unknown>;
  denied?: boolean;
};

type PluginRendererProps = {
  anchor: "dashboard.widget" | "lesson.sidebar";
  schoolId: string;
  actorId?: string;
  contextPayload?: Record<string, unknown>;
};

export async function PluginRenderer({ anchor, schoolId, actorId, contextPayload = {} }: PluginRendererProps) {
  const resolvedActorId = actorId ?? (await getCurrentUserDTO())?.id;

  if (!resolvedActorId?.trim() || !schoolId.trim()) {
    return null;
  }

  const plugins = await getEnabledPluginsForAnchor({
    actorId: resolvedActorId,
    schoolId,
    hookAnchor: anchor,
  });

  if (plugins.length === 0) {
    return null;
  }

  const proposals = await Promise.all(
    plugins.flatMap((plugin) =>
      plugin.manifestJson.actions.map((action) =>
        runPluginHook({
          actorId: resolvedActorId,
          pluginId: plugin.id,
          schoolId,
          hookAnchor: anchor,
          input: {
            pluginId: plugin.id,
            action,
            payload: contextPayload,
          },
        })
      )
    )
  );

  const visibleProposals = proposals.filter((proposal): proposal is PluginProposal => Boolean(proposal && !proposal.denied));
  if (visibleProposals.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-3">
      {visibleProposals.map((proposal, index) => (
        <PluginWidget key={`${proposal.proposalType}-${index}`} proposal={proposal} />
      ))}
    </section>
  );
}
