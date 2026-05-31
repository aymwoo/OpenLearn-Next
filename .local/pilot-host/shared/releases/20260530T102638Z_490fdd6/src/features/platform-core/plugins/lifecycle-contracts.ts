import { z } from "zod";

const GovernanceLifecycleInternalSubstateValues = [
  "installed",
  "enabled",
  "mounted",
  "ready",
  "suspended",
  "disabled",
  "failed",
] as const;

export const GovernanceLifecycleStateValues = [
  "installed",
  "enabled",
  "active",
  "suspended",
  "uninstalled",
] as const;

export const GovernanceLifecycleStateSchema = z.enum(GovernanceLifecycleStateValues);

export const PluginGovernanceReasonCodeValues = [
  "dependency_missing",
  "dependency_cycle",
  "activation_failed",
  "kill_switch",
  "not_enabled",
  "not_installed",
  "cleanup_confirmation_required",
] as const;

export const PluginGovernanceReasonCodeSchema = z.enum(PluginGovernanceReasonCodeValues);

export const PluginRecoveryActionValues = [
  "enable",
  "retry",
  "resume",
  "reconcile",
  "confirm_cleanup",
] as const;

export const PluginRecoveryActionSchema = z.enum(PluginRecoveryActionValues);

export const GovernanceLifecycleInternalSubstateSchema = z.enum(
  GovernanceLifecycleInternalSubstateValues,
);

export type GovernanceLifecycleState = z.infer<typeof GovernanceLifecycleStateSchema>;
export type PluginGovernanceReasonCode = z.infer<typeof PluginGovernanceReasonCodeSchema>;
export type PluginRecoveryAction = z.infer<typeof PluginRecoveryActionSchema>;
export type GovernanceLifecycleInternalSubstate = z.infer<typeof GovernanceLifecycleInternalSubstateSchema>;
