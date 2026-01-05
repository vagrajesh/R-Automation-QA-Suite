import OpenAI from 'openai';
import { appConfig } from '../../core/config';
import { logger } from '../logging/logger';
import { AIDiffResult } from './OpenAIDiffService';

export class OpenAIRouterDiffService {
  private client: OpenAI | null = null;

  constructor() {
    if (appConfig.openaiRouter.apiKey) {
      this.client = new OpenAI({
        apiKey: appConfig.openaiRouter.apiKey,
        baseURL: appConfig.openaiRouter.baseURL,
      });
    }
  }

  async compareImages(
    baselineImage: string,
    currentImage: string,
    context?: {
      url: string;
      viewport: { width: number; height: number };
      projectName?: string;
    }
  ): Promise<AIDiffResult> {
    if (!this.client) {
      throw new Error('OpenAI Router API key not configured');
    }

    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: appConfig.openaiRouter.model,
        max_tokens: appConfig.openaiRouter.maxTokens,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: this.buildPrompt(context) },
              {
                type: 'image_url',
                image_url: {
                  url: baselineImage.startsWith('data:') ? baselineImage : `data:image/png;base64,${baselineImage}`,
                }
              },
              {
                type: 'image_url',
                image_url: {
                  url: currentImage.startsWith('data:') ? currentImage : `data:image/png;base64,${currentImage}`,
                }
              }
            ]
          }
        ]
      });

      const processingTime = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens || 0;
      const result = this.parseAIResponse(response.choices[0]?.message?.content || '{}');

      logger.info('OpenAI Router diff completed', {
        model: appConfig.openaiRouter.model,
        tokensUsed,
        processingTime,
        isDifferent: result.isDifferent,
        confidence: result.confidence
      });

      return { ...result, tokensUsed, processingTime };
    } catch (error) {
      logger.error('OpenAI Router diff failed:', error);
      throw new Error(`OpenAI Router diff failed: ${error}`);
    }
  }

  private buildPrompt(context?: {
    url: string;
    viewport: { width: number; height: number };
    projectName?: string;
  }): string {
    return `You are an expert visual testing AI. Compare these two screenshots and identify any visual differences.

Context:
${context ? `- URL: ${context.url}` : ''}
${context ? `- Viewport: ${context.viewport.width}x${context.viewport.height}` : ''}
${context?.projectName ? `- Project: ${context.projectName}` : ''}

Instructions:
1. The first image is the BASELINE (expected)
2. The second image is the CURRENT (actual)
3. Identify ALL visual differences between them
4. Focus on layout changes, color differences, missing/added elements, text changes
5. Ignore minor anti-aliasing differences or browser rendering variations
6. Provide confidence score (0-100) for your analysis

Return a JSON response with this exact structure:
{
  "isDifferent": boolean,
  "confidence": number (0-100),
  "changes": [
    {
      "type": "layout|color|content|missing|added",
      "description": "Clear description of the change",
      "severity": "low|medium|high",
      "region": {"x": number, "y": number, "width": number, "height": number} // optional
    }
  ],
  "explanation": "Overall summary of differences found"
}`;
  }

  private parseAIResponse(content: string): Omit<AIDiffResult, 'tokensUsed' | 'processingTime'> {
    try {
      const parsed = JSON.parse(content);
      return {
        isDifferent: parsed.isDifferent || false,
        confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
        changes: Array.isArray(parsed.changes) ? parsed.changes : [],
        explanation: parsed.explanation || 'No explanation provided',
      };
    } catch (error) {
      logger.error('Failed to parse OpenAI Router response:', { content, error });
      return {
        isDifferent: false,
        confidence: 0,
        changes: [],
        explanation: 'Failed to parse OpenAI Router response',
      };
    }
  }
}