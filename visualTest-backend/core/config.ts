import { config } from './env';

export const appConfig = {
  port: config.PORT,
  nodeEnv: config.NODE_ENV,
  logLevel: config.LOG_LEVEL,
  database: {
    uri: config.MONGODB_URI,
    name: config.MONGODB_DATABASE,
  },
  app: {
    defaultDiffThreshold: config.DEFAULT_DIFF_THRESHOLD,
    maxRetries: config.MAX_RETRIES,
    queueConcurrency: config.QUEUE_CONCURRENCY,
  },
  playwright: {
    headless: config.PLAYWRIGHT_HEADLESS,
    timeout: config.PLAYWRIGHT_TIMEOUT,
  },
  openai: {
    apiKey: config.OPENAI_API_KEY,
    model: config.OPENAI_MODEL,
    maxTokens: config.OPENAI_MAX_TOKENS,
  },
  groq: {
    apiKey: config.GROQ_API_KEY,
    model: config.GROQ_MODEL,
    maxTokens: config.GROQ_MAX_TOKENS,
    explanationModel: config.GROQ_EXPLANATION_MODEL,
  },
  openaiRouter: {
    apiKey: config.OPENAI_ROUTER_API_KEY,
    baseURL: config.OPENAI_ROUTER_BASE_URL,
    model: config.OPENAI_ROUTER_MODEL,
    maxTokens: config.OPENAI_ROUTER_MAX_TOKENS,
  },
  ai: {
    provider: config.AI_PROVIDER,
    forceAI: config.FORCE_AI,
    pixelThreshold: config.PIXEL_MISMATCH_PERCENTAGE,
    aiThreshold: config.AI_THRESHOLD,
  },
  storage: {
    saveToFilesystem: config.SAVE_TO_FILESYSTEM,
    screenshotsDir: config.SCREENSHOTS_DIR,
  },
  dynamicContent: {
    disableAnimations: config.DISABLE_ANIMATIONS,
    blockAds: config.BLOCK_ADS,
    scrollToTriggerLazyLoad: config.SCROLL_TO_TRIGGER_LAZY_LOAD,
    multipleScreenshotsCount: config.MULTIPLE_SCREENSHOTS_COUNT,
    multipleScreenshotsInterval: config.MULTIPLE_SCREENSHOTS_INTERVAL,
    stabilityCheckTimeout: config.STABILITY_CHECK_TIMEOUT,
    networkIdleTimeout: config.NETWORK_IDLE_TIMEOUT,
  },
};