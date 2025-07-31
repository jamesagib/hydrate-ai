-- Remove review_mode column from profiles table
ALTER TABLE profiles DROP COLUMN IF EXISTS review_mode; 