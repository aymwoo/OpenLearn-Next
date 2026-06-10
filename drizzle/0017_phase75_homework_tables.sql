-- Phase 75-01: homework plugin — three tables (assignments, submissions, grades)
-- plugin_owned_homework_assignments: homework definitions (title, description, attachment, classroomSession)
-- plugin_owned_homework_submissions: student submissions (append-only with attemptNo/isLatest)
-- plugin_owned_homework_grades: teacher grading (append-only with attemptNo/isLatest)

CREATE TABLE plugin_owned_homework_assignments (
  id TEXT PRIMARY KEY,
  schoolId TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  pluginId TEXT NOT NULL REFERENCES pluginRegistrations(id) ON DELETE CASCADE,
  classroomSession TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  attachmentUrl TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX plugin_owned_homework_assignments_schoolId_classroomSession_idx
  ON plugin_owned_homework_assignments(schoolId, classroomSession);

CREATE TABLE plugin_owned_homework_submissions (
  id TEXT PRIMARY KEY,
  schoolId TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  pluginId TEXT NOT NULL REFERENCES pluginRegistrations(id) ON DELETE CASCADE,
  classroomSession TEXT NOT NULL,
  student TEXT NOT NULL,
  assignment TEXT NOT NULL,
  content TEXT NOT NULL,
  attachmentUrl TEXT,
  attemptNo INTEGER NOT NULL,
  isLatest INTEGER NOT NULL DEFAULT 1,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX plugin_owned_homework_submissions_schoolId_classroomSession_assignment_idx
  ON plugin_owned_homework_submissions(schoolId, classroomSession, assignment);

CREATE UNIQUE INDEX plugin_owned_homework_submissions_classroomSession_student_assignment_attemptNo_unique
  ON plugin_owned_homework_submissions(classroomSession, student, assignment, attemptNo);

CREATE INDEX plugin_owned_homework_submissions_classroomSession_student_assignment_isLatest_idx
  ON plugin_owned_homework_submissions(classroomSession, student, assignment, isLatest);

CREATE TABLE plugin_owned_homework_grades (
  id TEXT PRIMARY KEY,
  schoolId TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  pluginId TEXT NOT NULL REFERENCES pluginRegistrations(id) ON DELETE CASCADE,
  classroomSession TEXT NOT NULL,
  student TEXT NOT NULL,
  submission TEXT NOT NULL,
  score INTEGER,
  comment TEXT,
  attemptNo INTEGER NOT NULL,
  isLatest INTEGER NOT NULL DEFAULT 1,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX plugin_owned_homework_grades_schoolId_classroomSession_submission_idx
  ON plugin_owned_homework_grades(schoolId, classroomSession, submission);

CREATE UNIQUE INDEX plugin_owned_homework_grades_classroomSession_student_submission_attemptNo_unique
  ON plugin_owned_homework_grades(classroomSession, student, submission, attemptNo);

CREATE INDEX plugin_owned_homework_grades_classroomSession_student_submission_isLatest_idx
  ON plugin_owned_homework_grades(classroomSession, student, submission, isLatest);
