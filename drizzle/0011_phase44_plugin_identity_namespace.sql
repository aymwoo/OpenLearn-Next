-- Phase 44 namespace parity fixture
-- This repository snapshot does not include the original migration file,
-- but Phase 52 adversarial verification still depends on the canonical
-- namespace corpus staying stable across DAL helper and SQL-side backfill rules.

-- Required identity contract tokens referenced by historical verifiers:
-- pluginKey
-- dbNamespace

-- Namespace parity corpus (must stay aligned with deriveDbNamespace in src/lib/dal/plugins.ts)
-- vendor/plugin-name -> vendor_plugin_name
-- vendor--plugin..name -> vendor_plugin_name
-- 123-plugin -> p_123_plugin
-- vendor/plugin-------------------------------------------extremely-long-suffix -> vendor_plugin_extremely_long_suffix

-- Canonical SQL normalization sketch retained as fixture documentation:
-- lower(pluginKey)
-- replace separators [-.:/@\s]+ with "_"
-- collapse repeated underscores
-- trim leading/trailing underscores
-- prefix with "p_" when first character is not a-z
-- truncate to 48 chars
