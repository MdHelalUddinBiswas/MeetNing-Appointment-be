const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

// Create database connection
const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

async function runMigration() {
  try {
    // Enable uuid-ossp extension for UUID generation if not already enabled
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('UUID extension check completed');

    // Step 1: Create integrations table
    console.log('Creating integrations table...');
    await pool.query(`
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
      )
    `);
    console.log('Integrations table created successfully');

    // Step 2: Create meetings table
    console.log('Creating meetings table...');
    await pool.query(`
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
        status VARCHAR(20) DEFAULT 'scheduled',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('Meetings table created successfully');

    // Step 3: Create indexes (separately to better identify any issues)
    try {
      console.log('Creating index on integrations(user_id, app_type)...');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_integrations_user_app ON integrations(user_id, app_type)');
      console.log('Integrations index created successfully');
    } catch (indexError) {
      console.error('Error creating integrations index:', indexError.message);
      // Continue with other migrations even if index creation fails
    }

    try {
      console.log('Creating indexes on meetings table...');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_meetings_event ON meetings(event_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_meetings_user ON meetings(user_id)');
      console.log('Meetings indexes created successfully');
    } catch (indexError) {
      console.error('Error creating meetings indexes:', indexError.message);
      // Continue even if index creation fails
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error.message);
    if (error.position) {
      console.error(`Error position in SQL: ${error.position}`);
    }
  } finally {
    await pool.end();
  }
}

runMigration();
