import { z } from 'zod';

export const PixelDiffDto = z.object({
  projectId: z.string().uuid(),
  baselineId: z.string().uuid(),
  currentImage: z.string().optional(), // Base64 image (optional if URL provided)
  url: z.string().url().optional(), // URL to capture screenshot
  viewport: z.object({
    width: z.number().positive(),
    height: z.number().positive()
  }).optional(),
  waitTime: z.number().positive().optional(),
  threshold: z.number().min(0).max(1).optional().default(0.1),
});

export type PixelDiffRequest = z.infer<typeof PixelDiffDto>;