# LLM Integration Setup Guide

## Quick Start

### 1. Copy Environment Template
```bash
cp .env.example .env.local
```

### 2. Add Your API Keys
Edit `.env.local` and add your actual API keys:

```env
# Example for OpenAI
VITE_OPENAI_API_KEY=sk-your-actual-key-here
VITE_OPENAI_API_ENDPOINT=https://api.openai.com/v1
VITE_OPENAI_DEFAULT_MODEL=gpt-4-turbo

# Example for Groq
VITE_GROQ_API_KEY=gsk-your-actual-key-here
VITE_GROQ_API_ENDPOINT=https://api.groq.com/openai/v1
VITE_GROQ_DEFAULT_MODEL=mixtral-8x7b-32768
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Access LLM Settings
Navigate to Settings → LLM Integration tab

---

## Supported LLM Providers

### OpenAI
- **Website**: https://platform.openai.com
- **API Key Format**: `sk-...`
- **Default Endpoint**: `https://api.openai.com/v1`
- **Available Models**:
  - gpt-4-turbo (128K tokens, $0.01/$0.03 per 1k)
  - gpt-4 (8K tokens, $0.03/$0.06 per 1k)
  - gpt-3.5-turbo (4K tokens, $0.0015/$0.002 per 1k)
  - gpt-4o (128K tokens, multimodal)

### Groq
- **Website**: https://console.groq.com
- **API Key Format**: `gsk_...`
- **Default Endpoint**: `https://api.groq.com/openai/v1`
- **Available Models**:
  - mixtral-8x7b-32768 (32K tokens)
  - llama2-70b-4096 (4K tokens)
  - gemma-7b-it (8K tokens)
  - llama-3-70b (8K tokens)

### Azure OpenAI
- **Website**: https://azure.microsoft.com/en-us/products/ai-services/openai-service/
- **API Key Format**: Standard API key
- **Default Endpoint**: `https://your-resource.openai.azure.com/`
- **Required Fields**:
  - Deployment Name
  - API Version (e.g., 2024-02-15-preview)
- **Available Models**:
  - gpt-4 (8K tokens)
  - gpt-4-32k (32K tokens)
  - gpt-35-turbo (4K tokens)
  - gpt-4-turbo (128K tokens)

### Claude (Anthropic)
- **Website**: https://www.anthropic.com
- **API Key Format**: `sk-ant-...`
- **Default Endpoint**: `https://api.anthropic.com`
- **Available Models**:
  - claude-3-opus-20240229 (200K tokens, $0.015/$0.075 per 1k) - Most intelligent
  - claude-3-sonnet-20240229 (200K tokens, $0.003/$0.015 per 1k) - Balanced
  - claude-3-haiku-20240307 (200K tokens, cheapest) - Fastest
  - claude-2.1 (100K tokens, previous version)

### TestLeaf
- **Website**: https://testleaf.com
- **API Key Format**: Provided by TestLeaf
- **Default Endpoint**: `https://api.testleaf.com/v1`
- **Available Models**:
  - testleaf-sft (8K tokens) - Standard
  - testleaf-pro (16K tokens) - Enhanced
  - testleaf-enterprise (32K tokens) - Advanced

---

## Configuration Files

### .env.local
```env
# OpenAI
VITE_OPENAI_API_KEY=sk-...
VITE_OPENAI_API_ENDPOINT=https://api.openai.com/v1
VITE_OPENAI_DEFAULT_MODEL=gpt-4-turbo

# Groq
VITE_GROQ_API_KEY=gsk_...
VITE_GROQ_API_ENDPOINT=https://api.groq.com/openai/v1
VITE_GROQ_DEFAULT_MODEL=mixtral-8x7b-32768

# Azure OpenAI
VITE_AZURE_OPENAI_API_KEY=...
VITE_AZURE_OPENAI_API_ENDPOINT=https://your-resource.openai.azure.com/
VITE_AZURE_OPENAI_DEFAULT_MODEL=gpt-4
VITE_AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
VITE_AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Claude
VITE_CLAUDE_API_KEY=sk-ant-...
VITE_CLAUDE_API_ENDPOINT=https://api.anthropic.com
VITE_CLAUDE_DEFAULT_MODEL=claude-3-opus-20240229

# TestLeaf
VITE_TESTLEAF_API_KEY=...
VITE_TESTLEAF_API_ENDPOINT=https://api.testleaf.com/v1
VITE_TESTLEAF_DEFAULT_MODEL=testleaf-sft
```

---

## Using LLM Integrations in Code

### Import the LLM Service
```typescript
import { llmService } from './services/llmService';
import { LLMProvider, getModelsByProvider } from './config/llmConfig';
```

### Get Configured Provider
```typescript
const config = llmService.getConfig('openai');
if (config) {
  console.log('OpenAI configured with model:', config.model);
  console.log('Endpoint:', config.endpoint);
}
```

### List Available Models
```typescript
const models = getModelsByProvider('openai');
models.forEach(model => {
  console.log(`${model.name} - ${model.description}`);
  console.log(`  Context: ${model.contextWindow} tokens`);
  if (model.costPer1kTokens) {
    console.log(`  Cost: $${model.costPer1kTokens.input}/$${model.costPer1kTokens.output} per 1k`);
  }
});
```

### Test Connection
```typescript
const result = await llmService.testConnection('openai');
if (result.success) {
  console.log('Connection successful!');
} else {
  console.error('Connection failed:', result.message);
}
```

### Get All Configured Providers
```typescript
const providers = llmService.getConfiguredProviders();
providers.forEach(provider => {
  console.log('Configured provider:', provider);
});
```

---

## API Connection Details

### OpenAI Headers
```
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

### Groq Headers
```
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

### Azure OpenAI Headers
```
api-key: {API_KEY}
Content-Type: application/json
```

### Claude Headers
```
x-api-key: {API_KEY}
anthropic-version: 2023-06-01
Content-Type: application/json
```

### TestLeaf Headers
```
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

---

## Common Issues & Solutions

### Issue: "supabaseUrl is required"
**Solution**: This error was from the old Supabase dependency. It's been removed. Ensure you've updated to the latest code.

### Issue: API Key not working
**Solution**: 
1. Verify the API key format is correct for your provider
2. Check the API key has necessary permissions
3. Verify the endpoint URL is correct
4. Test with the "Test Connection" button in the UI

### Issue: Model not available
**Solution**:
1. Check you've selected a valid model from the dropdown
2. Verify the model is available for your provider
3. Some models may require specific regions or deployments

### Issue: Connection timeout
**Solution**:
1. Check your internet connection
2. Verify the API endpoint URL is correct and accessible
3. The default timeout is 10 seconds - increase if needed for slow connections

### Issue: Form validation errors
**Solution**:
- **API Key**: Must not be empty, should start with provider prefix (sk-, gsk_, sk-ant-)
- **Endpoint**: Must be a valid URL
- **Model**: Must be selected from the dropdown
- **Azure fields**: Deployment name and API version are required for Azure OpenAI

---

## Deployment Considerations

### Development
- Use `.env.local` for local development
- Restart dev server after changing environment variables

### Production
- Use environment variables from your hosting platform (Vercel, Netlify, etc.)
- Never commit `.env.local` to version control
- Use a secrets manager for API keys
- Enable HTTPS for all API connections
- Implement rate limiting

### Environment Variable Precedence
1. Runtime environment variables (highest priority)
2. `.env.local` (local development)
3. `.env.example` (default fallback values)

---

## Testing the Integration

### Manual Testing
1. Navigate to Settings → LLM Integration
2. Click "Configure" on any provider
3. Enter API key and select a model
4. Click "Save Configuration"
5. Click "Test Connection" to verify
6. Check the models browser to see available options

### Programmatic Testing
```typescript
// Test all configured providers
const providers = llmService.getConfiguredProviders();
for (const provider of providers) {
  const result = await llmService.testConnection(provider);
  console.log(`${provider}: ${result.success ? '✅' : '❌'} ${result.message}`);
}
```

---

## Performance Notes

- **Connection caching**: Results cached for 5 minutes to avoid repeated API calls
- **Timeout protection**: 10-second timeout prevents hanging requests
- **Lazy loading**: Models only fetched when needed
- **Production build**: ~198 KB gzipped (optimized)

---

## Security Best Practices

✅ **DO:**
- Store API keys in `.env.local` (never in code)
- Use the configuration guide in the UI
- Test connections before production deployment
- Monitor API usage and quota

❌ **DON'T:**
- Commit `.env.local` to version control
- Log or display full API keys
- Hardcode API keys in code
- Share configuration exports containing API keys

---

## Support & Documentation

- **OpenAI Docs**: https://platform.openai.com/docs
- **Groq Docs**: https://console.groq.com/docs
- **Azure OpenAI**: https://learn.microsoft.com/azure/ai-services/openai/
- **Claude Docs**: https://docs.anthropic.com
- **TestLeaf Docs**: https://testleaf.com/docs

---

## Troubleshooting

### Check TypeScript Types
```bash
npm run typecheck
```

### Check Code Style
```bash
npm run lint
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

---

**Status**: Production Ready ✅
