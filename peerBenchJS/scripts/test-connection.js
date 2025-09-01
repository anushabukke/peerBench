#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/webapp/.env.local') });

// Database configuration
const databaseUrl = process.env.DATABASE_URL;

console.log('🔍 Testing database connection...\n');

if (!databaseUrl) {
  console.error('❌ Missing required environment variable:');
  console.error('DATABASE_URL:', databaseUrl ? '✓' : '✗');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log('🔗 Database URL:', databaseUrl ? '✓ (present)' : '✗ (missing)');

async function testConnection() {
  let sql;
  let db;
  
  try {
    console.log('\n🔄 Testing database connection...');
    
    // Create postgres client
    sql = postgres(databaseUrl, { max: 1 });
    
    // Test basic connection
    const result = await sql`SELECT version()`;
    console.log('✅ Database connection successful');
    console.log('📊 PostgreSQL version:', result[0].version);
    
    // Test if orgs table exists
    try {
      const tableCheck = await sql`SELECT COUNT(*) FROM orgs LIMIT 1`;
      console.log('✅ Orgs table exists and is accessible');
      console.log('📊 Current orgs count:', tableCheck[0].count);
    } catch (tableError) {
      if (tableError.code === '42P01') {
        console.log('⚠️  Orgs table does not exist yet - this is expected if migration hasn\'t been run');
        console.log('💡 Run the migration first: cd ../apps/webapp && npx drizzle-kit push');
      } else {
        console.error('❌ Error accessing orgs table:', tableError.message);
      }
    }
    
    console.log('\n🎉 Connection test completed successfully!');
    console.log('💡 You can now run: npm run populate-orgs');
    
  } catch (error) {
    console.error('💥 Connection test failed:', error.message);
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

testConnection();
