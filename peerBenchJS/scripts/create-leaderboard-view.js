#!/usr/bin/env node

import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/webapp/.env.local') });

// Database configuration
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Missing required environment variable:');
  console.error('DATABASE_URL:', databaseUrl ? '✓' : '✗');
  process.exit(1);
}

async function createLeaderboardView() {
  let sql;
  
  try {
    console.log('🔍 Creating leaderboard view...');
    
    // Create postgres client
    sql = postgres(databaseUrl, { max: 1 });
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../apps/webapp/supabase/sql/v_leaderboard.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📖 Read SQL file:', sqlPath);
    
    // Execute the SQL to create the view
    await sql.unsafe(sqlContent);
    
    console.log('✅ Leaderboard view created successfully!');
    
    // Verify the view exists
    const viewCheck = await sql`SELECT COUNT(*) FROM v_leaderboard LIMIT 1`;
    console.log('✅ View verification successful - view exists and is accessible');
    
  } catch (error) {
    console.error('💥 Error creating leaderboard view:', error.message);
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

createLeaderboardView().then(() => {
  console.log('✨ Script finished successfully');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
