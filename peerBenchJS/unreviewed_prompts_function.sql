-- SQL Function to get prompts that a user has not yet reviewed
-- This function takes a user_id as input and returns all prompts
-- that the user has not reviewed yet

-- Version 1: Using NOT EXISTS (current implementation in the service)
CREATE OR REPLACE FUNCTION get_unreviewed_prompts(p_user_id UUID)
RETURNS TABLE (
    prompt_id UUID,
    prompt_set_id INTEGER,
    prompt_set_title TEXT,
    file_id INTEGER,
    file_cid TEXT,
    file_uploader_id UUID,
    type VARCHAR(30),
    question TEXT,
    answer TEXT,
    answer_key TEXT,
    full_prompt TEXT,
    metadata JSONB,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as prompt_id,
        p.prompt_set_id,
        ps.title as prompt_set_title,
        p.file_id,
        f.cid as file_cid,
        f.uploader_id as file_uploader_id,
        p.type,
        p.question,
        p.answer,
        p.answer_key,
        p.full_prompt,
        p.metadata,
        p.created_at
    FROM prompts p
    INNER JOIN prompt_sets ps ON p.prompt_set_id = ps.id
    INNER JOIN files f ON p.file_id = f.id
    WHERE NOT EXISTS (
        -- Subquery to check if this prompt has been reviewed by the user
        SELECT 1 
        FROM prompt_reviews pr 
        WHERE pr.prompt_id = p.id 
        AND pr.user_id = p_user_id
    )
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Version 2: Using LEFT JOIN (as requested by user - simpler and more performant)
CREATE OR REPLACE FUNCTION get_unreviewed_prompts_left_join(p_user_id UUID)
RETURNS TABLE (
    prompt_id UUID,
    prompt_set_id INTEGER,
    prompt_set_title TEXT,
    file_id INTEGER,
    file_cid TEXT,
    file_uploader_id UUID,
    type VARCHAR(30),
    question TEXT,
    answer TEXT,
    answer_key TEXT,
    full_prompt TEXT,
    metadata JSONB,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as prompt_id,
        p.prompt_set_id,
        ps.title as prompt_set_title,
        p.file_id,
        f.cid as file_cid,
        f.uploader_id as file_uploader_id,
        p.type,
        p.question,
        p.answer,
        p.answer_key,
        p.full_prompt,
        p.metadata,
        p.created_at
    FROM prompts p
    INNER JOIN prompt_sets ps ON p.prompt_set_id = ps.id
    INNER JOIN files f ON p.file_id = f.id
    LEFT JOIN prompt_reviews pr ON pr.prompt_id = p.id AND pr.user_id = p_user_id
    WHERE pr.prompt_id IS NULL  -- This means no review exists for this user
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM get_unreviewed_prompts('your-user-uuid-here');
-- SELECT * FROM get_unreviewed_prompts_left_join('your-user-uuid-here');

-- Raw SQL version (for reference):
-- SELECT * FROM prompts p
--     LEFT JOIN prompt_reviews pr ON pr.prompt_id = p.id AND pr.user_id = 'current_user_id'
--     WHERE pr.prompt_id IS NULL;
