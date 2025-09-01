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

async function runSqlFile(sqlFilePath) {
  let sql;
  
  try {
    console.log('🔍 Running SQL file...');
    console.log('📁 File:', sqlFilePath);
    
    // Check if file exists
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ SQL file not found:', sqlFilePath);
      process.exit(1);
    }
    
    // Create postgres client
    sql = postgres(databaseUrl, { max: 1 });
    
    // Read the SQL file
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📖 Read SQL file successfully');
    console.log('📊 File size:', (sqlContent.length / 1024).toFixed(2), 'KB');
    
    // Execute the SQL
    await sql.unsafe(sqlContent);
    
    console.log('✅ SQL file executed successfully!');
    
  } catch (error) {
    console.error('💥 Error executing SQL file:', error.message);
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

// Get SQL file path from command line argument
const sqlFile = process.argv[2];

if (!sqlFile) {
  console.error('❌ Usage: node run-sql-file.js <path-to-sql-file>');
  console.error('Example: node run-sql-file.js create-user-profile-table.sql');
  process.exit(1);
}

// Resolve the full path
const fullPath = path.isAbsolute(sqlFile) ? sqlFile : path.join(__dirname, sqlFile);

runSqlFile(fullPath).then(() => {
  console.log('✨ Script finished successfully');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
