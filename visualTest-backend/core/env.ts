import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  MONGODB_URI: z.string(),
  MONGODB_DATABASE: z.string().default('visualTesting'),
  DEFAULT_DIFF_THRESHOLD: z.string().transform(Number).default('95'),
  MAX_RETRIES: z.string().transform(Number).default('3'),
  QUEUE_CONCURRENCY: z.string().transform(Number).default('5'),
  PLAYWRIGHT_HEADLESS: z.string().transform(val => val !== 'false').default('true'),
  PLAYWRIGHT_TIMEOUT: z.string().transform(Number).default('30000'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-vision-preview'),
  OPENAI_MAX_TOKENS: z.string().transform(Number).default('1000'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.2-11b-vision-preview'),
  GROQ_MAX_TOKENS: z.string().transform(Number).default('1000'),
  GROQ_EXPLANATION_MODEL: z.string().default('llama3-70b-8192'),
  OPENAI_ROUTER_API_KEY: z.string().optional(),
  OPENAI_ROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  OPENAI_ROUTER_MODEL: z.string().default('anthropic/claude-3.5-sonnet:beta'),
  OPENAI_ROUTER_MAX_TOKENS: z.string().transform(Number).default('1000'),
  AI_PROVIDER: z.enum(['openai', 'groq', 'openai_router', 'hybrid']).default('openai'),
  FORCE_AI: z.string().transform(val => val === 'true').default('false'),
  PIXEL_MISMATCH_PERCENTAGE: z.string().transform(Number).default('5'),
  AI_THRESHOLD: z.string().transform(Number).default('70'),
  SAVE_TO_FILESYSTEM: z.string().transform(val => val === 'true').default('false'),
  SCREENSHOTS_DIR: z.string().default('./screenshots'),
  // Dynamic content handling
  DISABLE_ANIMATIONS: z.string().transform(val => val === 'true').default('false'),
  BLOCK_ADS: z.string().transform(val => val === 'true').default('false'),
  SCROLL_TO_TRIGGER_LAZY_LOAD: z.string().transform(val => val === 'true').default('false'),
  MULTIPLE_SCREENSHOTS_COUNT: z.string().transform(Number).default('1'),
  MULTIPLE_SCREENSHOTS_INTERVAL: z.string().transform(Number).default('1000'),
  STABILITY_CHECK_TIMEOUT: z.string().transform(Number).default('5000'),
  NETWORK_IDLE_TIMEOUT: z.string().transform(Number).default('2000'),
});

export const config = envSchema.parse(process.env);