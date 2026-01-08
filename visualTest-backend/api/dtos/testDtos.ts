import { z } from 'zod';

export const RunTestDto = z.object({
  projectId: z.string().uuid(),
  baselineId: z.string().uuid().optional(),
  url: z.string().url(),
  viewport: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
  priority: z.enum(['HIGH', 'NORMAL', 'LOW']).optional(),
  waitConditions: z.array(z.string()).optional(),
  dynamicContent: z.object({
    disableAnimations: z.boolean().optional(),
    blockAds: z.boolean().optional(),
    scrollToTriggerLazyLoad: z.boolean().optional(),
    multipleScreenshots: z.boolean().optional(),
    stabilityCheck: z.boolean().optional(),
    maskSelectors: z.array(z.string()).optional(),
  }).optional(),
});

export type RunTestRequest = z.infer<typeof RunTestDto>;