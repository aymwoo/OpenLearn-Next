export type PluginDependencyNode = {
  pluginId: string;
  dependencies: readonly string[];
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
