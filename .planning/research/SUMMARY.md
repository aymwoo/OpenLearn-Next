# Project research summary

**Project:** OpenLearn Next  
**Milestone:** v1.2 Course Import & Management  
**Researched:** 2026-05-09  
**Confidence:** HIGH

## Executive summary

The next milestone should not expand the platform outward. It should close the
gap between the existing course schema and a real teacher-facing course
management workflow. That means one teacher-scoped course center, one consistent
course lifecycle contract, safe class and student associations, and one batch
import path that reuses the same DAL rules as manual course management.

## Key findings

**Stack additions:** keep the current Next.js 16, Auth.js, Drizzle, SQLite, DAL,
and Server Action stack; add a Node-runtime batch import contract with typed
preview and result DTOs.

**Feature table stakes:** course list, manual create/edit, publish or archive
lifecycle, safe delete, class and student associations, batch import, and a
direct course-to-lesson management handoff.

**Watch out for:** school-scope authorization leaks, duplicate imports,
inconsistent course status visibility, destructive delete behavior, and missing
cache invalidation after course mutations.

## Roadmap implications

1. Build the course center and manual management foundation first.
2. Add lifecycle controls and association management second.
3. Finish with batch import preview, apply, and result feedback on top of the
   same mutation rules.
