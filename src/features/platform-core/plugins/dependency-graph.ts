export type PluginDependencyNode = {
  pluginId: string;
  dependencies: readonly string[];
};

export type PluginActivationChain = {
  orderedPluginIds: string[];
  missingDependencies: string[];
  cycles: string[][];
};

export type RegistryProjectionActivationInput = {
  pluginId: string;
  pluginKey: string;
  dependencies: readonly string[];
  enabled: boolean;
};

function unique(items: readonly string[]) {
  return [...new Set(items)];
}

export function orderPluginDependencies(nodes: readonly PluginDependencyNode[]) {
  const byId = new Map(nodes.map((node) => [node.pluginId, unique(node.dependencies)]));
  const ordered: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(pluginId: string) {
    if (visited.has(pluginId)) {
      return;
    }

    if (visiting.has(pluginId)) {
      throw new Error(`PLUGIN_DEPENDENCY_CYCLE:${pluginId}`);
    }

    visiting.add(pluginId);
    for (const dependency of byId.get(pluginId) ?? []) {
      if (byId.has(dependency)) {
        visit(dependency);
      }
    }
    visiting.delete(pluginId);
    visited.add(pluginId);
    ordered.push(pluginId);
  }

  for (const node of nodes) {
    visit(node.pluginId);
  }

  return ordered;
}

export function detectPluginDependencyCycles(nodes: readonly PluginDependencyNode[]) {
  const byId = new Map(nodes.map((node) => [node.pluginId, unique(node.dependencies)]));
  const cycles: string[][] = [];
  const seen = new Set<string>();

  function normalizeCycle(cycle: string[]) {
    const base = cycle.slice(0, -1);
    if (base.length === 0) {
      return cycle;
    }

    let best = [...base];
    for (let index = 1; index < base.length; index += 1) {
      const rotated = [...base.slice(index), ...base.slice(0, index)];
      if (rotated.join("->") < best.join("->")) {
        best = rotated;
      }
    }

    return [...best, best[0]];
  }

  function walk(pluginId: string, trail: string[]) {
    const loopIndex = trail.indexOf(pluginId);
    if (loopIndex >= 0) {
      const cycle = normalizeCycle([...trail.slice(loopIndex), pluginId]);
      const key = cycle.join("->");
      if (!seen.has(key)) {
        seen.add(key);
        cycles.push(cycle);
      }
      return;
    }

    const nextTrail = [...trail, pluginId];
    for (const dependency of byId.get(pluginId) ?? []) {
      if (byId.has(dependency)) {
        walk(dependency, nextTrail);
      }
    }
  }

  for (const node of nodes) {
    walk(node.pluginId, []);
  }

  return cycles;
}

export function resolvePluginActivationChain(
  nodes: readonly PluginDependencyNode[],
  targetPluginId: string,
): PluginActivationChain {
  const byId = new Map(nodes.map((node) => [node.pluginId, unique(node.dependencies)]));
  const included = new Set<string>();
  const missing = new Set<string>();

  function visit(pluginId: string) {
    if (included.has(pluginId)) {
      return;
    }
    included.add(pluginId);

    for (const dependency of byId.get(pluginId) ?? []) {
      if (!byId.has(dependency)) {
        missing.add(dependency);
        continue;
      }
      visit(dependency);
    }
  }

  visit(targetPluginId);

  const scopedNodes = nodes.filter((node) => included.has(node.pluginId));
  const cycles = detectPluginDependencyCycles(scopedNodes);
  let orderedPluginIds: string[] = [];

  try {
    orderedPluginIds = orderPluginDependencies(scopedNodes);
  } catch {
    orderedPluginIds = scopedNodes.map((node) => node.pluginId);
  }

  return {
    orderedPluginIds,
    missingDependencies: [...missing],
    cycles,
  };
}

export function readRegistryProjectionBundleForSchool(
  plugins: readonly RegistryProjectionActivationInput[],
  targetPluginId: string,
) {
  const target = plugins.find((plugin) => plugin.pluginId === targetPluginId);
  if (!target) {
    return {
      orderedPluginIds: [targetPluginId],
      missingDependencies: [],
      cycles: [],
    };
  }

  const byKey = new Map(plugins.map((plugin) => [plugin.pluginKey, plugin]));
  const nodes: PluginDependencyNode[] = plugins.map((plugin) => ({
    pluginId: plugin.pluginId,
    dependencies: plugin.dependencies
      .map((dependencyKey) => byKey.get(dependencyKey)?.pluginId ?? dependencyKey),
  }));

  return resolvePluginActivationChain(nodes, target.pluginId);
}
