#!/bin/bash

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌱 Seeding test system prompts via API...${NC}\n"

# Check if PEERBENCH_API_KEY is set
if [ -z "$PEERBENCH_API_KEY" ]; then
  echo -e "${YELLOW}⚠️  PEERBENCH_API_KEY not set.${NC}"
  echo -e "${YELLOW}   Please create an API key:${NC}"
  echo -e "${YELLOW}   1. Login to http://localhost:3001${NC}"
  echo -e "${YELLOW}   2. Go to Settings (http://localhost:3001/settings)${NC}"
  echo -e "${YELLOW}   3. In the 'PeerBench API Keys' section, click 'Create New Key'${NC}"
  echo -e "${YELLOW}   4. Copy the generated key (starts with 'pb_')${NC}\n"
  echo -n "Enter your API key: "
  read PEERBENCH_API_KEY
  echo ""
fi

API_URL="http://localhost:3001/api/v2/system-prompts"

# 1. Create multiple-choice-expert prompt
echo -e "${BLUE}Creating 'multiple-choice-expert' prompt...${NC}"
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PEERBENCH_API_KEY" \
  -d '{
    "name": "multiple-choice-expert",
    "tags": ["evaluation", "multiple-choice", "testing"],
    "type": "text",
    "prompt": "Your explanation can'\''t be longer than 400 tokens. The last sentence must be formatted as one of the following:\n- The answer is <answer letter>\n- The answer is **<answer letter>**\n- <answer letter>: ...\n- <answer letter>) ...\nReplace <answer letter> with the letter of your chosen answer.\n\nUse the following string as your last sentence if you are not capable of answering the question:\n<!NO ANSWER!>",
    "config": {
      "temperature": 0.7,
      "max_tokens": 500
    },
    "labels": ["latest", "production"]
  }')

if echo "$RESPONSE" | grep -q "error"; then
  echo -e "${RED}❌ Error: $RESPONSE${NC}\n"
else
  SHA256=$(echo "$RESPONSE" | grep -o '"sha256Hash":"[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}✅ Created multiple-choice-expert${NC}"
  echo -e "   SHA256: $SHA256\n"
fi

# 2. Create movie-critic-chat prompt
echo -e "${BLUE}Creating 'movie-critic-chat' prompt...${NC}"
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PEERBENCH_API_KEY" \
  -d '{
    "name": "movie-critic-chat",
    "tags": ["entertainment", "chat", "critique"],
    "type": "chat",
    "prompt": [
      {
        "role": "system",
        "content": "You are an {{criticlevel}} movie critic with deep knowledge of cinema."
      },
      {
        "role": "user",
        "content": "What do you think about {{movie}}?"
      }
    ],
    "config": {
      "model": "gpt-4o",
      "temperature": 0.8
    },
    "labels": ["latest", "development"]
  }')

if echo "$RESPONSE" | grep -q "error"; then
  echo -e "${RED}❌ Error: $RESPONSE${NC}\n"
else
  echo -e "${GREEN}✅ Created movie-critic-chat (v1)${NC}\n"
fi

# 3. Create version 2 of movie-critic-chat
echo -e "${BLUE}Creating version 2 of 'movie-critic-chat'...${NC}"
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PEERBENCH_API_KEY" \
  -d '{
    "name": "movie-critic-chat",
    "type": "chat",
    "prompt": [
      {
        "role": "system",
        "content": "You are an {{criticlevel}} movie critic specializing in {{genre}} films."
      },
      {
        "role": "user",
        "content": "Please provide a detailed review of {{movie}}."
      }
    ],
    "config": {
      "model": "gpt-4o",
      "temperature": 0.9
    },
    "labels": ["latest", "production"],
    "createNewVersion": true
  }')

if echo "$RESPONSE" | grep -q "error"; then
  echo -e "${RED}❌ Error: $RESPONSE${NC}\n"
else
  echo -e "${GREEN}✅ Created movie-critic-chat (v2)${NC}\n"
fi

# 4. Create open-ended-expert prompt
echo -e "${BLUE}Creating 'open-ended-expert' prompt...${NC}"
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PEERBENCH_API_KEY" \
  -d '{
    "name": "open-ended-expert",
    "tags": ["qa", "knowledge", "concise"],
    "type": "text",
    "prompt": "You are a knowledgeable expert. Please provide a clear, accurate, short and well-reasoned answer to the following question. Be concise but comprehensive in your response. Your answer must be short and clear with less than 20 words.",
    "labels": ["latest", "production"]
  }')

if echo "$RESPONSE" | grep -q "error"; then
  echo -e "${RED}❌ Error: $RESPONSE${NC}\n"
else
  echo -e "${GREEN}✅ Created open-ended-expert${NC}\n"
fi

echo -e "${GREEN}🎉 Successfully seeded test prompts!${NC}"
echo -e "\n${BLUE}📊 Summary:${NC}"
echo -e "   - Created 3 prompts"
echo -e "   - Total 4 versions (movie-critic-chat has 2 versions)"
echo -e "\n${BLUE}🌐 View them at:${NC} http://localhost:3001/admin_routes/system-prompts"
echo -e "\n${BLUE}📝 Test retrieval:${NC}"
echo -e "   curl http://localhost:3001/api/v2/system-prompts?name=multiple-choice-expert"
echo -e "   curl http://localhost:3001/api/v2/system-prompts?name=movie-critic-chat&label=production"
echo -e "   curl http://localhost:3001/api/v2/system-prompts/list"
