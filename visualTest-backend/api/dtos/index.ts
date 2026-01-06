import { z } from 'zod';

export const CreateProjectDto = z.object({
  name: z.string().min(1).max(100),
  baseUrl: z.string().url(),
  diffThreshold: z.number().min(0).max(100).optional(),
  aiEnabled: z.boolean().optional(),
});

export const UpdateProjectDto = z.object({
  name: z.string().min(1).max(100).optional(),
  baseUrl: z.string().url().optional(),
  diffThreshold: z.number().min(0).max(100).optional(),
  aiEnabled: z.boolean().optional(),
});

export const CreateBaselineDto = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  image: z.string().optional(), // Optional when file is uploaded
  viewport: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  url: z.string().url(),
  domSnapshot: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateProjectRequest = z.infer<typeof CreateProjectDto>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectDto>;
export type CreateBaselineRequest = z.infer<typeof CreateBaselineDto>;