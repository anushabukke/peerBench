-- Create user_profile table
CREATE TABLE IF NOT EXISTS user_profile (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  
  -- User editable fields
  display_name TEXT,
  github TEXT,
  website TEXT,
  bluesky TEXT,
  mastodon TEXT,
  twitter TEXT,
  
  -- System fields (not editable by user)
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Constraints
  UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON user_profile(user_id);

-- Create index on invited_by for future queries
CREATE INDEX IF NOT EXISTS idx_user_profile_invited_by ON user_profile(invited_by);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_profile TO public;
GRANT SELECT, INSERT, UPDATE ON user_profile TO anon;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profile_updated_at 
    BEFORE UPDATE ON user_profile 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert a comment for documentation
COMMENT ON TABLE user_profile IS 'User profile information including social media links and display name';
COMMENT ON COLUMN user_profile.user_id IS 'References the auth.users table';
COMMENT ON COLUMN user_profile.invited_by IS 'User who invited this user (set by backend, not editable by user)';
