-- Phase 73-01: Add questionType column to plugin_owned_quiz_questions
-- 5 enum values: single_choice | multi_choice | true_false | fill_blank | ordering
-- Old rows default to 'single_choice' for forward + backward compatibility
ALTER TABLE plugin_owned_quiz_questions ADD COLUMN questionType TEXT NOT NULL DEFAULT 'single_choice';