export const MODEL_CONFIGS = {
  groq: {
    modelName: "openai/gpt-oss-120b",
    temperature: 0.1,
    maxTokens: 8000
  },
  openai: {
    modelName: "gpt-4-turbo-0613",
    temperature: 0.1,
    maxTokens: 4000
  },
  anthropic: {
    modelName: "claude-3-5-sonnet-20241022",
    temperature: 0.1,
    maxTokens: 4000
  }
};