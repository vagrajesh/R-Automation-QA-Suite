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
});

export type RunTestRequest = z.infer<typeof RunTestDto>;