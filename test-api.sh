#!/bin/bash

# Test the User Story Analysis API endpoint

echo "Testing User Story Analysis API..."
echo "=================================="

# Sample story data
STORY_DATA='{
  "story": {
    "id": "US-001",
    "key": "TEST-001",
    "title": "User login functionality",
    "description": "As a user, I want to login to the system with my credentials",
    "acceptanceCriteria": "Given user with valid credentials, When user logs in, Then user should be redirected to dashboard",
    "status": "Open",
    "priority": "High",
    "source": "jira"
  },
  "provider": "openai",
  "model": "gpt-4o-mini"
}'

# Make the request
curl -X POST http://localhost:8080/api/user-story/analyze \
  -H "Content-Type: application/json" \
  -d "$STORY_DATA"

echo ""
echo "Test complete!"
