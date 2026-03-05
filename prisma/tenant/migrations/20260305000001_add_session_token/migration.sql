-- Migration: add_session_token
-- Adds currentSessionToken to users and students tables for single-device session enforcement.

ALTER TABLE "users" ADD COLUMN "currentSessionToken" TEXT;
ALTER TABLE "students" ADD COLUMN "currentSessionToken" TEXT;
