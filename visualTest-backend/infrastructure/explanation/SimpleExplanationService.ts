import { appConfig } from '../../core/config';
import { logger } from '../logging/logger';

export interface ExplanationResult {
  summary: string;
  details: string;
  recommendations: string[];
  severity: 'low' | 'medium' | 'high';
}

export class SimpleExplanationService {
  async generateExplanation(testResult: {
    similarityScore: number;
    isDifferent: boolean;
    changes: Array<{
      type: string;
      description: string;
      severity: string;
    }>;
    method: string;
    url?: string;
  }): Promise<ExplanationResult> {
    try {
      const prompt = `Analyze this visual test result and provide a clear explanation:

Test Result:
- Similarity Score: ${testResult.similarityScore}%
- Different: ${testResult.isDifferent}
- Method: ${testResult.method}
- URL: ${testResult.url || 'N/A'}
- Changes: ${JSON.stringify(testResult.changes)}

Provide a JSON response with:
{
  "summary": "Brief 1-sentence summary",
  "details": "Detailed explanation of findings",
  "recommendations": ["action1", "action2"],
  "severity": "low|medium|high"
}`;

      const response = await this.getGroqExplanation(prompt);
      return this.parseResponse(response);
    } catch (error) {
      logger.error('Explanation generation failed:', error);
      return this.getFallbackExplanation(testResult);
    }
  }

  private async getGroqExplanation(prompt: string): Promise<string> {
    const Groq = require('groq-sdk');
    const groq = new Groq({
      apiKey: appConfig.groq.apiKey,
    });

    const response = await groq.chat.completions.create({
      model: appConfig.groq.explanationModel,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || '{}';
  }

  private parseResponse(content: string): ExplanationResult {
    try {
      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || 'Analysis completed',
        details: parsed.details || 'No detailed analysis available',
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        severity: ['low', 'medium', 'high'].includes(parsed.severity) ? parsed.severity : 'medium',
      };
    } catch (error) {
      logger.error('Failed to parse explanation response:', error);
      return this.getFallbackExplanation();
    }
  }

  private getFallbackExplanation(testResult?: any): ExplanationResult {
    if (!testResult) {
      return {
        summary: 'Visual test analysis completed',
        details: 'Unable to generate detailed explanation',
        recommendations: ['Review test results manually'],
        severity: 'medium',
      };
    }

    const similarity = testResult.similarityScore;
    let severity: 'low' | 'medium' | 'high' = 'low';
    let summary = '';

    if (similarity >= 95) {
      severity = 'low';
      summary = 'Images are nearly identical with minor differences';
    } else if (similarity >= 80) {
      severity = 'medium';
      summary = 'Images have moderate differences that may need attention';
    } else {
      severity = 'high';
      summary = 'Images have significant differences requiring review';
    }

    return {
      summary,
      details: `Similarity score: ${similarity}%. ${testResult.changes.length} changes detected.`,
      recommendations: testResult.isDifferent ? ['Review visual changes', 'Update baseline if intended'] : ['No action needed'],
      severity,
    };
  }
}