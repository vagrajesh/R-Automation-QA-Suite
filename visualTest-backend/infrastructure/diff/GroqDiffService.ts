import Groq from 'groq-sdk';
import { appConfig } from '../../core/config';
import { logger } from '../logging/logger';

export interface AIDiffResult {
  isDifferent: boolean;
  confidence: number;
  changes: Array<{
    type: 'layout' | 'color' | 'content' | 'missing' | 'added';
    description: string;
    severity: 'low' | 'medium' | 'high';
    region?: { x: number; y: number; width: number; height: number };
  }>;
  explanation: string;
  tokensUsed: number;
  processingTime: number;
}

export class GroqDiffService {
  private groq: Groq | null = null;

  constructor() {
    if (appConfig.groq.apiKey) {
      this.groq = new Groq({
        apiKey: appConfig.groq.apiKey,
      });
    }
  }

  async compareImages(
    baselineImage: string, // Base64
    currentImage: string,   // Base64
    context?: {
      url: string;
      viewport: { width: number; height: number };
      projectName?: string;
    }
  ): Promise<AIDiffResult> {
    if (!this.groq) {
      throw new Error('Groq API key not configured');
    }

    const startTime = Date.now();

    try {
      const prompt = this.buildPrompt(context);

      const response = await this.groq.chat.completions.create({
        model: appConfig.groq.model,
        max_tokens: appConfig.groq.maxTokens,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
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
        ],
        response_format: { type: 'json_object' }
      });

      const processingTime = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens || 0;

      const result = this.parseAIResponse(response.choices[0]?.message?.content || '{}');

      logger.info('Groq diff completed', {
        model: appConfig.groq.model,
        tokensUsed,
        processingTime,
        isDifferent: result.isDifferent,
        confidence: result.confidence
      });

      return {
        ...result,
        tokensUsed,
        processingTime,
      };
    } catch (error) {
      logger.error('Groq diff failed:', error);
      throw new Error(`Groq diff failed: ${error}`);
    }
  }

  private buildPrompt(context?: {
    url: string;
    viewport: { width: number; height: number };
    projectName?: string;
  }): string {
    return `You are an expert visual testing AI using Llama 3.2 Vision. Compare these two screenshots and identify any visual differences.

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
      logger.error('Failed to parse Groq response:', { content, error });
      return {
        isDifferent: false,
        confidence: 0,
        changes: [],
        explanation: 'Failed to parse Groq response',
      };
    }
  }
}