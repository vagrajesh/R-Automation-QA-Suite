import { PixelDiffService, PixelDiffResult } from './PixelDiffService';
import { OpenAIDiffService, AIDiffResult } from './OpenAIDiffService';
import { GroqDiffService } from './GroqDiffService';
import { OpenAIRouterDiffService } from './OpenAIRouterDiffService';
import { SimpleExplanationService, ExplanationResult } from '../explanation/SimpleExplanationService';
import { appConfig } from '../../core/config';
import { logger } from '../logging/logger';

export interface HybridDiffResult {
  isDifferent: boolean;
  confidence: number;
  method: 'pixel' | 'openai' | 'groq' | 'openai_router' | 'hybrid';
  pixelDiff?: PixelDiffResult;
  aiDiff?: AIDiffResult;
  diffImage: string;
  changes: Array<{
    type: 'layout' | 'color' | 'content' | 'missing' | 'added';
    description: string;
    severity: 'low' | 'medium' | 'high';
    region?: { x: number; y: number; width: number; height: number };
  }>;
  explanation: string;
  aiExplanation?: ExplanationResult;
  pixelAnalysis: {
    mismatchPercentage: number;
    similarityScore: number;
    confidence: number;
  };
  aiAnalysis?: {
    similarityScore: number;
    confidence: number;
  };
  metadata: {
    pixelThreshold: number;
    aiThreshold: number;
    processingTime: number;
    tokensUsed?: number;
    aiProvider?: string;
  };
}

export class HybridDiffEngine {
  constructor(
    private pixelDiffService: PixelDiffService,
    private openAIDiffService: OpenAIDiffService,
    private groqDiffService: GroqDiffService,
    private openaiRouterDiffService: OpenAIRouterDiffService,
    private explanationService: SimpleExplanationService
  ) {}

  async compareImages(
    baselineImage: string,
    currentImage: string,
    options: {
      pixelThreshold?: number;
      aiThreshold?: number;
      forceAI?: boolean;
      aiProvider?: 'openai' | 'groq' | 'openai_router' | 'hybrid';
      context?: {
        url: string;
        viewport: { width: number; height: number };
        projectName?: string;
      };
    } = {}
  ): Promise<HybridDiffResult> {
    const startTime = Date.now();
    const pixelThreshold = options.pixelThreshold || 5;
    const aiThreshold = options.aiThreshold || 70;
    const aiProvider = options.aiProvider || appConfig.ai.provider;

    try {
      // Step 1: Always run pixel diff first (fast)
      logger.info('Starting pixel diff comparison');
      const pixelResult = await this.pixelDiffService.compareImages(baselineImage, currentImage);

      // Step 2: Decide if AI analysis is needed
      const needsAI = options.forceAI || 
                     ( pixelResult.mismatchPercentage > pixelThreshold);

      let aiResult: AIDiffResult | undefined;
      let method: 'pixel' | 'openai' | 'groq' | 'openai_router' | 'hybrid' = 'pixel';
      let usedProvider: string | undefined;

      if (needsAI) {
        logger.info('Running AI diff analysis', { 
          pixelMismatch: pixelResult.mismatchPercentage,
          provider: aiProvider,
          reason: options.forceAI ? 'forced' : 'pixel_threshold_exceeded'
        });
        
        aiResult = await this.runAIDiff(baselineImage, currentImage, aiProvider, options.context);
        method = aiResult ? (aiProvider === 'groq' ? 'groq' : aiProvider === 'openai_router' ? 'openai_router' : 'openai') : 'pixel';
        usedProvider = aiProvider;
      } else {
        logger.info('AI diff analysis skipped', {
          pixelMismatch: pixelResult.mismatchPercentage,
          pixelThreshold: pixelThreshold,
          forceAI: options.forceAI,
          reason: !options.forceAI ? 'pixel_mismatch_below_threshold' : 'force_ai_disabled'
        });
      }

      // Step 3: Combine results
      const result = this.combineResults(pixelResult, aiResult, {
        pixelThreshold,
        aiThreshold,
        method,
        processingTime: Date.now() - startTime,
        aiProvider: usedProvider,
      });

      // Step 4: Generate AI explanation
      try {
        const aiExplanation = await this.explanationService.generateExplanation({
          similarityScore: result.similarityScore,
          isDifferent: result.isDifferent,
          changes: result.changes,
          method: result.method,
          url: options.context?.url,
        });
        result.aiExplanation = aiExplanation;
        logger.info('AI explanation generated successfully', {
          summary: aiExplanation.summary,
          severity: aiExplanation.severity
        });
      } catch (error) {
        logger.warn('Failed to generate AI explanation:', error);
      }

      logger.info('Hybrid diff completed', {
        method: result.method,
        isDifferent: result.isDifferent,
        confidence: result.confidence,
        processingTime: result.metadata.processingTime,
        aiProvider: usedProvider,
        pixelAnalysis: result.pixelAnalysis,
        aiAnalysis: result.aiAnalysis
      });

      return result;
    } catch (error) {
      logger.error('Hybrid diff failed:', error);
      throw error;
    }
  }

  private async runAIDiff(
    baselineImage: string,
    currentImage: string,
    provider: string,
    context?: any
  ): Promise<AIDiffResult | undefined> {
    try {
      switch (provider) {
        case 'openai':
          return await this.openAIDiffService.compareImages(baselineImage, currentImage, context);
        case 'groq':
          return await this.groqDiffService.compareImages(baselineImage, currentImage, context);
        case 'openai_router':
          return await this.openaiRouterDiffService.compareImages(baselineImage, currentImage, context);
        case 'hybrid':
          // Try providers in order: Groq -> OpenAI Router -> OpenAI
          try {
            return await this.groqDiffService.compareImages(baselineImage, currentImage, context);
          } catch (groqError) {
            logger.warn('Groq failed, trying OpenAI Router:', groqError);
            try {
              return await this.openaiRouterDiffService.compareImages(baselineImage, currentImage, context);
            } catch (routerError) {
              logger.warn('OpenAI Router failed, falling back to OpenAI:', routerError);
              return await this.openAIDiffService.compareImages(baselineImage, currentImage, context);
            }
          }
        case 'both':
          // Legacy support - try Groq first, fallback to OpenAI
          try {
            return await this.groqDiffService.compareImages(baselineImage, currentImage, context);
          } catch (groqError) {
            logger.warn('Groq failed, falling back to OpenAI:', groqError);
            return await this.openAIDiffService.compareImages(baselineImage, currentImage, context);
          }
        default:
          logger.warn(`Unknown AI provider: ${provider}, using OpenAI`);
          return await this.openAIDiffService.compareImages(baselineImage, currentImage, context);
      }
    } catch (error) {
      logger.error(`AI diff failed with provider ${provider}:`, error);
      return undefined;
    }
  }

  private combineResults(
    pixelResult: PixelDiffResult,
    aiResult?: AIDiffResult,
    metadata: {
      pixelThreshold: number;
      aiThreshold: number;
      method: 'pixel' | 'openai' | 'groq' | 'openai_router' | 'hybrid';
      processingTime: number;
      aiProvider?: string;
    }
  ): HybridDiffResult {
    const pixelSimilarity = Math.max(0, 100 - pixelResult.mismatchPercentage);

    if (!aiResult) {
      const pixelConfidence = pixelResult.mismatchPercentage > metadata.pixelThreshold ? 90 : 95;
      return {
        isDifferent: pixelResult.mismatchPercentage > metadata.pixelThreshold,
        confidence: pixelConfidence,
        method: 'pixel',
        pixelDiff: pixelResult,
        diffImage: pixelResult.diffImage,
        changes: this.generatePixelChanges(pixelResult),
        explanation: `Pixel comparison: ${pixelResult.mismatchPercentage.toFixed(2)}% difference`,
        pixelAnalysis: {
          mismatchPercentage: pixelResult.mismatchPercentage,
          similarityScore: pixelSimilarity,
          confidence: pixelConfidence,
        },
        metadata: {
          ...metadata,
          tokensUsed: 0,
        },
      };
    }

    const finalIsDifferent = this.decideFinalResult(pixelResult, aiResult, metadata);
    const combinedConfidence = this.calculateCombinedConfidence(pixelResult, aiResult);
    const aiSimilarityScore = aiResult.isDifferent ? (100 - aiResult.confidence) : aiResult.confidence;
    const pixelConfidence = pixelResult.mismatchPercentage > metadata.pixelThreshold ? 90 : 95;

    return {
      isDifferent: finalIsDifferent,
      confidence: combinedConfidence,
      method: metadata.method,
      pixelDiff: pixelResult,
      aiDiff: aiResult,
      diffImage: pixelResult.diffImage,
      changes: aiResult.changes.length > 0 ? aiResult.changes : this.generatePixelChanges(pixelResult),
      explanation: aiResult.explanation || `Hybrid analysis: ${pixelResult.mismatchPercentage.toFixed(2)}% pixel difference`,
      pixelAnalysis: {
        mismatchPercentage: pixelResult.mismatchPercentage,
        similarityScore: pixelSimilarity,
        confidence: pixelConfidence,
      },
      aiAnalysis: {
        similarityScore: aiSimilarityScore,
        confidence: aiResult.confidence,
      },
      metadata: {
        ...metadata,
        tokensUsed: aiResult.tokensUsed,
      },
    };
  }

  private decideFinalResult(
    pixelResult: PixelDiffResult,
    aiResult: AIDiffResult,
    metadata: { pixelThreshold: number; aiThreshold: number }
  ): boolean {
    if (pixelResult.mismatchPercentage > metadata.pixelThreshold * 2) {
      return true;
    }
    if (pixelResult.mismatchPercentage < 0.1) {
      return false;
    }
    if (aiResult.confidence >= metadata.aiThreshold) {
      return aiResult.isDifferent;
    }
    return pixelResult.mismatchPercentage > metadata.pixelThreshold;
  }

  private calculateCombinedConfidence(pixelResult: PixelDiffResult, aiResult: AIDiffResult): number {
    if (aiResult.confidence >= 80) {
      return Math.round(aiResult.confidence * 0.8 + 20);
    }
    const pixelConfidence = pixelResult.mismatchPercentage > 5 ? 90 : 95;
    return Math.round((pixelConfidence + aiResult.confidence) / 2);
  }

  private generatePixelChanges(pixelResult: PixelDiffResult): Array<{
    type: 'layout' | 'color' | 'content' | 'missing' | 'added';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }> {
    if (!pixelResult.isDifferent) {
      return [];
    }

    const severity = pixelResult.mismatchPercentage > 10 ? 'high' : 
                    pixelResult.mismatchPercentage > 2 ? 'medium' : 'low';

    return [{
      type: 'color',
      description: `${pixelResult.diffPixels} pixels differ (${pixelResult.mismatchPercentage.toFixed(2)}%)`,
      severity,
    }];
  }
}