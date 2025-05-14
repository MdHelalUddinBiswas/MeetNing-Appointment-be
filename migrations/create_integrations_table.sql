-- First check if we need to create a users table for development purposes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      password VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

-- Create integrations table to store OAuth tokens and settings
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  app_type VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date BIGINT,
  metadata JSONB DEFAULT '{}',
  is_connected BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, app_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_integrations_user_app ON integrations(user_id, app_type);

-- First check if we need to create an appointments table for development purposes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'appointments') THEN
    CREATE TABLE appointments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title VARCHAR(255),
      description TEXT,
      start_time TIMESTAMP WITH TIME ZONE,
      end_time TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

-- Create meetings table to store meeting information
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  meet_link TEXT,
  calendar_event_id VARCHAR(255),
  calendar_app_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for event and user lookups
CREATE INDEX IF NOT EXISTS idx_meetings_event ON meetings(event_id);
CREATE INDEX IF NOT EXISTS idx_meetings_user ON meetings(user_id);
