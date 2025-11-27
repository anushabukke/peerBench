# PeerBench API Keys

PeerBench now supports API key authentication as an alternative to Supabase auth tokens for API requests.

## Features

- ✅ Generate multiple API keys per user
- ✅ Name your keys for easy identification
- ✅ Secure API key format: `pb_<40-character-hex-string>`
- ✅ View masked keys for security
- ✅ Revoke keys anytime
- ✅ Works with all authenticated endpoints

## Getting Started

### 1. Create an API Key

**Via UI:**
1. Login to http://localhost:3001
2. Navigate to Settings: http://localhost:3001/settings
3. Find the "PeerBench API Keys" section
4. Click "Create New Key"
5. Give it a name (e.g., "Production API", "Development")
6. Copy the generated key (⚠️ You won't see it again!)

**API Response Example:**
```json
{
  "id": 1,
  "key": "pb_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
  "name": "My API Key",
  "createdAt": "2024-11-14T12:00:00.000Z"
}
```

### 2. Use Your API Key

Add the API key to the `Authorization` header with `Bearer` prefix:

```bash
curl -X POST http://localhost:3001/api/v2/system-prompts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer pb_your_api_key_here" \
  -d '{
    "name": "test-prompt",
    "type": "text",
    "prompt": "You are a helpful assistant."
  }'
```

### 3. Manage Your Keys

**List all keys:**
```bash
curl http://localhost:3001/api/v2/profile/keys/peerbench \
  -H "Authorization: Bearer pb_your_api_key_here"
```

**Delete a key:**
```bash
curl -X DELETE http://localhost:3001/api/v2/profile/keys/peerbench/{keyId} \
  -H "Authorization: Bearer pb_your_api_key_here"
```

## Authentication Flow

When a request is received with `Authorization: Bearer <token>`:

1. **Check if token starts with `pb_`**
   - If yes → Validate as PeerBench API key
   - If no → Validate as Supabase auth token

2. **PeerBench API Key Validation**
   - Lookup key in `api_keys` table
   - Verify `provider` is "peerbench"
   - Return associated `assignedUserId`

3. **Success**
   - Request is authenticated
   - `userId` is available for authorization checks

## API Endpoints

### List API Keys
```
GET /api/v2/profile/keys/peerbench
```
Returns masked keys for security (e.g., `pb_a1b2c...s9t0`)

### Create API Key
```
POST /api/v2/profile/keys/peerbench
Content-Type: application/json

{
  "name": "My API Key" // optional
}
```

### Delete API Key
```
DELETE /api/v2/profile/keys/peerbench/{keyId}
```

## Security Best Practices

✅ **DO:**
- Store API keys in environment variables
- Use different keys for different environments (dev, staging, prod)
- Rotate keys regularly
- Delete unused keys
- Never commit keys to version control

❌ **DON'T:**
- Share API keys publicly
- Use the same key across multiple applications
- Store keys in client-side code
- Leave test keys in production

## Environment Setup

For scripts and applications, set the environment variable:

```bash
export PEERBENCH_API_KEY="pb_your_api_key_here"
```

Then use in your scripts:
```bash
curl -H "Authorization: Bearer $PEERBENCH_API_KEY" \
  http://localhost:3001/api/v2/system-prompts
```

## Seed Script Example

The included seed script now uses PeerBench API keys:

```bash
cd apps/webapp

# Option 1: Set environment variable
export PEERBENCH_API_KEY="pb_your_key_here"
./scripts/seed-via-api.sh

# Option 2: Script will prompt you
./scripts/seed-via-api.sh
# Enter your API key: pb_your_key_here
```

## Database Schema

```sql
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  assigned_user_id UUID NOT NULL REFERENCES auth.users(id),
  provider VARCHAR(50) NOT NULL, -- 'peerbench' or 'openrouter.ai'
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Code Examples

### TypeScript/JavaScript
```typescript
const apiKey = process.env.PEERBENCH_API_KEY;

const response = await fetch('http://localhost:3001/api/v2/system-prompts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    name: 'my-prompt',
    type: 'text',
    prompt: 'Hello, world!'
  })
});
```

### Python
```python
import os
import requests

api_key = os.environ.get('PEERBENCH_API_KEY')

response = requests.post(
    'http://localhost:3001/api/v2/system-prompts',
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    },
    json={
        'name': 'my-prompt',
        'type': 'text',
        'prompt': 'Hello, world!'
    }
)
```

## Support

For issues or questions:
- Check the Settings UI for key management
- Review this documentation
- Contact support or open an issue
