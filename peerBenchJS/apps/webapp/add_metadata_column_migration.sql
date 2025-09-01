-- Add metadata column to key_to_user table
-- This migration adds a JSONB column to store device and IP information

ALTER TABLE "key_to_user" 
ADD COLUMN "metadata" JSONB DEFAULT '{}';

-- Update existing rows to have empty metadata
UPDATE "key_to_user" 
SET "metadata" = '{}' 
WHERE "metadata" IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE "key_to_user" 
ALTER COLUMN "metadata" SET NOT NULL;

-- Show the updated table structure
\d "key_to_user"
