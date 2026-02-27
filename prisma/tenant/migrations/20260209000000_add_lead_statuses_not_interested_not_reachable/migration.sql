/*
  Warnings:

  - Added new values `NotInterested` and `NotReachable` to the `LeadStatus` enum.
  - This migration extends the lead workflow to handle cases where leads are not interested or unreachable.

*/

-- AlterEnum
-- Add new values to LeadStatus enum
ALTER TYPE "LeadStatus" ADD VALUE 'NotInterested';
ALTER TYPE "LeadStatus" ADD VALUE 'NotReachable';
