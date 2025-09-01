#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../apps/webapp/.env.local') });

// Database configuration
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Missing required environment variable:');
  console.error('DATABASE_URL:', databaseUrl ? '✓' : '✗');
  process.exit(1);
}

// Create database connection
const sql = postgres(databaseUrl, { max: 10 });
const db = drizzle(sql);

// Helper function to clean domain/URL
function cleanDomain(url) {
  if (!url) return null;
  
  // Remove protocol and www
  let cleaned = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
  
  // Remove trailing slash
  cleaned = cleaned.replace(/\/$/, '');
  
  return cleaned;
}

// Helper function to extract domain from email
function extractDomainFromEmail(email) {
  if (!email) return null;
  return email.split('@')[1];
}

async function populateOrgs() {
  try {
    console.log('🚀 Starting organization population...');
    
    // Read the JSON file
    const jsonPath = path.join(__dirname, '../static/world_universities_and_domains.json');
    console.log(`📖 Reading data from: ${jsonPath}`);
    
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found at: ${jsonPath}`);
    }
    
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const universities = JSON.parse(rawData);
    
    console.log(`📊 Found ${universities.length} universities to process`);
    
    let orgsCreated = 0;
    let domainsCreated = 0;
    let skipped = 0;
    
    // Process each university
    for (const uni of universities) {
      try {
        // Extract the first web page
        const webPage = uni.web_pages && uni.web_pages.length > 0 ? uni.web_pages[0] : null;
        const cleanedWebPage = cleanDomain(webPage);
        
        // Create the organization using raw SQL for better control
        const orgResult = await sql`
          INSERT INTO orgs (name, web_page, alpha_two_code, country)
          VALUES (${uni.name}, ${cleanedWebPage}, ${uni.alpha_two_code}, ${uni.country})
          RETURNING id
        `;
        
        if (!orgResult || orgResult.length === 0) {
          console.error(`❌ Failed to create org "${uni.name}"`);
          skipped++;
          continue;
        }
        
        const orgId = orgResult[0].id;
        orgsCreated++;
        console.log(`✅ Created org: ${uni.name} (ID: ${orgId})`);
        
        // Process domains
        const domains = new Set();
        
        // Add email domains
        if (uni.domains && Array.isArray(uni.domains)) {
          uni.domains.forEach(domain => {
            if (domain) domains.add(domain);
          });
        }
        
        // Add web page domains
        if (cleanedWebPage) {
          domains.add(cleanedWebPage);
        }
        
        // Insert unique domains
        for (const domain of domains) {
          try {
            await sql`
              INSERT INTO org_domains (org_id, domain)
              VALUES (${orgId}, ${domain})
              ON CONFLICT (domain) DO NOTHING
            `;
            
            // Check if the insert actually happened
            const domainCheck = await sql`
              SELECT id FROM org_domains WHERE domain = ${domain} AND org_id = ${orgId}
            `;
            
            if (domainCheck.length > 0) {
              domainsCreated++;
              console.log(`  📧 Added domain: ${domain}`);
            } else {
              console.log(`  ⚠️  Domain ${domain} already exists for another org, skipping`);
            }
            
          } catch (domainErr) {
            console.error(`❌ Error processing domain ${domain}:`, domainErr.message);
          }
        }
        
      } catch (uniErr) {
        console.error(`❌ Error processing university "${uni.name}":`, uniErr.message);
        skipped++;
      }
    }
    
    console.log('\n🎉 Population completed!');
    console.log(`📊 Summary:`);
    console.log(`   Organizations created: ${orgsCreated}`);
    console.log(`   Domains created: ${domainsCreated}`);
    console.log(`   Skipped: ${skipped}`);
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await sql.end();
  }
}

// Run the script
populateOrgs().then(() => {
  console.log('✨ Script finished successfully');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
