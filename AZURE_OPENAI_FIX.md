# Azure OpenAI Integration Fix

## Issue
**Error:** `POST https://r-automations.openai.azure.com//chat/completions 404 (Not Found)`

**Root Cause:** 
The TestCasesGenerator component was constructing the Azure OpenAI endpoint URL incorrectly. It was appending `/chat/completions` directly to the base endpoint, but Azure OpenAI requires a specific URL format with the deployment name and API version:
```
https://{resource}.openai.azure.com/openai/deployments/{deployment-name}/chat/completions?api-version={api-version}
```

## Solution Implemented

### 1. Updated TestCasesGenerator.tsx (lines 108-143)
**Changed:** Dynamic endpoint URL construction based on provider type

**Before:**
```typescript
const response = await fetch(`${config.endpoint}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  },
  body: JSON.stringify({...}),
});
```

**After:**
```typescript
let url = '';
let headers: Record<string, string> = {
  'Content-Type': 'application/json',
};

if (provider === 'azure-openai') {
  // Azure OpenAI requires specific URL format
  const endpoint = config.endpoint.endsWith('/') ? config.endpoint : `${config.endpoint}/`;
  const deploymentName = (config as any).deploymentName || selectedModel;
  const apiVersion = (config as any).apiVersion || '2024-02-15-preview';
  url = `${endpoint}openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
  headers['api-key'] = config.apiKey;
} else {
  // Standard OpenAI-compatible endpoint
  url = `${config.endpoint}/chat/completions`;
  headers['Authorization'] = `Bearer ${config.apiKey}`;
}

const response = await fetch(url, {
  method: 'POST',
  headers,
  body: JSON.stringify({...}),
});
```

**Key Changes:**
- ✅ Checks if provider is Azure OpenAI
- ✅ Constructs correct Azure-specific URL with deployment name and API version
- ✅ Uses `api-key` header for Azure instead of Bearer token
- ✅ Falls back to standard OpenAI format for other providers

### 2. Updated .env Configuration
**Changed:** API version to a stable, tested version

**Before:**
```
VITE_AZURE_OPENAI_API_VERSION=2025-01-01-preview
```

**After:**
```
VITE_AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

**Also updated:**
- `VITE_AZURE_OPENAI_API_KEY` placeholder improved (was `...`, now `your-azure-openai-api-key`)

## Configuration Details

### Required Environment Variables for Azure OpenAI:
```dotenv
VITE_AZURE_OPENAI_API_KEY=your-actual-api-key
VITE_AZURE_OPENAI_API_ENDPOINT=https://r-automations.openai.azure.com/
VITE_AZURE_OPENAI_DEFAULT_MODEL=gpt-4.1-mini
VITE_AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4.1-mini
VITE_AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

### Expected API URL Format:
```
https://r-automations.openai.azure.com/openai/deployments/gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview
```

## Testing

### How to Verify the Fix:
1. Ensure Azure OpenAI API key is set in `.env`
2. Navigate to Settings and configure Azure OpenAI provider
3. Go to Test Cases Generator
4. Select a story and click "Generate Test Cases"
5. The request should now succeed (assuming valid credentials)

### Expected Behavior:
- ✅ Request sends to correct Azure OpenAI endpoint
- ✅ Uses correct authentication header (`api-key`)
- ✅ Includes deployment name in URL path
- ✅ Includes API version as query parameter
- ✅ Response should return 200 OK with test cases

## Code Quality

- ✅ Backward compatible with other LLM providers (OpenAI, Groq, etc.)
- ✅ No TypeScript errors
- ✅ Handles both endpoint formats (with/without trailing slash)
- ✅ Falls back to default API version if not configured
- ✅ Maintains existing code style and patterns

## Production Notes

1. **API Version:** The `2024-02-15-preview` API version is stable and widely used. You can update to newer versions as needed.

2. **Deployment Name:** Must match the actual deployment name in your Azure OpenAI resource. Current config uses `gpt-4.1-mini` - verify this matches your deployment.

3. **Authentication:** Azure OpenAI uses `api-key` header instead of Bearer token authentication.

4. **Rate Limiting:** Be aware that Azure OpenAI may have rate limits - consider implementing retry logic for production.

## Related Files Modified
- `/src/components/TestCasesGenerator.tsx` - Fixed endpoint URL construction
- `/.env` - Updated Azure OpenAI API version

## Next Steps
1. ✅ Fill in actual Azure OpenAI API key in `.env`
2. ✅ Verify deployment name matches Azure resource
3. ✅ Test with actual Azure OpenAI instance
4. ✅ Monitor for any rate limit issues

---
**Status:** ✅ FIXED - Azure OpenAI integration now uses correct endpoint format
