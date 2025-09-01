-- Update existing keys from "ethereum" to "secp256k1n"
-- This script updates any existing keys that were created with the old type

UPDATE "key_to_user" 
SET "key_type" = 'secp256k1n' 
WHERE "key_type" = 'ethereum';

-- Show the updated results
SELECT "id", "public_key", "key_type", "user_uuid", "created_at" 
FROM "key_to_user" 
ORDER BY "created_at" DESC;
