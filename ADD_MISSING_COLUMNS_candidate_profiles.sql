-- SQL to add current_mood column to candidate_profiles table
-- Run this in Supabase SQL Editor

-- Add current_mood column if it doesn't exist
ALTER TABLE candidate_profiles 
ADD COLUMN IF NOT EXISTS current_mood TEXT;

-- All other fields should already exist based on schema:
-- ✅ gender_custom (String?)
-- ✅ location_place_id (String?)
-- ✅ location_lat (Float?)
-- ✅ location_lng (Float?)
-- ✅ location_city (String?)
-- ✅ location_province (String?)
-- ✅ location_country (String?)
-- ✅ location_barangay (String?)
-- ✅ location_region (String?)
-- ✅ current_salary (Decimal?)
-- ✅ expected_salary_min (Decimal?)
-- ✅ expected_salary_max (Decimal?)
-- ✅ notice_period_days (Int?)
-- ✅ preferred_shift (Shift enum)
-- ✅ preferred_work_setup (WorkSetup enum)

-- Note: username is stored in candidates table, not candidate_profiles (correct)
-- Note: currentMood can be stored in gamification JSON field if no dedicated column

-- Verify all columns exist:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'candidate_profiles'
ORDER BY ordinal_position;

