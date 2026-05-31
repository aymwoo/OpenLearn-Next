/**
 * Seed script to register the exam plugin.
 * Run with: pnpm tsx scripts/seed-exam-plugin.ts
 *
 * Prerequisites:
 * 1. Ensure you have a working dev database: pnpm db:bootstrap:dev
 * 2. Get a teacher ID and school ID from your dev database
 *
 * The manifest JSON can also be used to register the plugin via the admin UI.
 */

const EXAM_PLUGIN_MANIFEST = {
  id: "exam-plugin",
  version: "1.0.0",
  manifestVersion: 2,
  anchors: ["lesson.exam"],
  permissions: [],
  actions: [],
  builtIn: false,
  defaultEnabled: true,
  nonDeletable: false,
  governance: {
    manifestVersion: 2,
    contractVersion: "v2",
    runtime: {
      version: "v2",
      runtimeId: "exam-plugin",
      runtimeVersion: "1.0.0",
      kind: "plugin-runtime",
      displayName: "考试插件",
      stateSchemaVersion: "exam-v1",
      entry: {
        sandbox: "iframe",
        bootstrap: "/runtime/exam",
      },
      bootstrap: {
        contextMode: "minimal",
        resumeStrategy: "latest-or-create",
        capabilitySnapshot: "session-scoped",
      },
      submitTarget: {
        targets: ["task-submission"],
      },
      requestedCapabilities: [
        "runtime:ready",
        "runtime:state:save",
        "runtime:submission:create",
      ],
    },
    requestedCapabilities: [],
    permissions: [],
    lifecycle: {
      ownerType: "host",
      installScope: "school",
      initialState: "installed",
      mountMode: "session-bootstrap",
    },
  },
}

console.log("Exam Plugin Manifest:")
console.log(JSON.stringify(EXAM_PLUGIN_MANIFEST, null, 2))
console.log("\nTo register this plugin, use the registerPluginManifestAction from @/actions/plugin-actions")
console.log("with a valid teacher actorId and schoolId.")