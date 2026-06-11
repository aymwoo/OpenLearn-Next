-- Phase 75-02-GAP: homework plugin v1.0.0 → v1.1.0 upgrade migration
-- Schema change: add dueDate column to homework assignments table
ALTER TABLE plugin_owned_homework_assignments ADD COLUMN dueDate TEXT;
