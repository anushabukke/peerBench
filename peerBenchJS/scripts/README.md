# PeerBench Organization Scripts

This directory contains utility scripts for managing organizations in the PeerBench system.

## Setup

1. Install dependencies:
```bash
cd scripts
npm install
```

2. Ensure you have the required environment variables in `../apps/webapp/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Scripts

### populate-orgs.js

Populates the database with organization data from the `world_universities_and_domains.json` file.

**Usage:**
```bash
npm run populate-orgs
```

**What it does:**
- Reads the JSON file containing university data
- Creates organizations in the `orgs` table
- Creates domain entries in the `org_domains` table
- Handles duplicate domains gracefully
- Provides detailed logging of the process

**Data Processing:**
- Extracts the first web page from `web_pages` array for the `web_page` field
- Cleans domains by removing `http://`, `https://`, and `www.` prefixes
- Ensures unique domains across all organizations
- Maps email domains and web domains to organizations

## Database Schema

The script creates the following tables:

### `orgs`
- `id`: Primary key
- `name`: Organization name
- `web_page`: Primary web page (cleaned)
- `alpha_two_code`: Country code (e.g., "US", "UK")
- `country`: Country name
- `created_at`, `updated_at`: Timestamps

### `org_domains`
- `id`: Primary key
- `org_id`: Foreign key to `orgs.id`
- `domain`: Unique domain string
- `created_at`: Timestamp

### `org_to_people`
- `id`: Primary key
- `org_id`: Foreign key to `orgs.id`
- `user_id`: Foreign key to `auth.users.id`
- `created_at`: Timestamp

## Running the Migration

Before running the script, ensure the database migration has been applied:

```bash
cd ../apps/webapp
npx drizzle-kit push
```

## Troubleshooting

- **Missing environment variables**: Ensure both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- **Permission errors**: The script requires the service role key to insert data
- **Duplicate domains**: The script handles this gracefully and will skip existing domains
- **Large datasets**: The script processes universities one by one to avoid memory issues
