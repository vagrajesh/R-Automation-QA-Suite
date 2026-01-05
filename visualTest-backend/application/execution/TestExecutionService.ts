import { TestRun } from '../../domain/models/TestRun';
import { TestResult } from '../../domain/models/TestResult';
import { PlaywrightService } from '../../infrastructure/browser/PlaywrightService';
import { HybridDiffEngine } from '../../infrastructure/diff/HybridDiffEngine';
import { FileStorageService } from '../../infrastructure/storage/FileStorageService';
import { IBaselineRepository } from '../../domain/repositories/IBaselineRepository';
import { ITestResultRepository } from '../../domain/repositories/ITestResultRepository';
import { appConfig } from '../../core/config';
import { logger } from '../../infrastructure/logging/logger';
import { v4 as uuidv4 } from 'uuid';

export class TestExecutionService {
  constructor(
    private playwrightService: PlaywrightService,
    private hybridDiffEngine: HybridDiffEngine,
    private baselineRepository: IBaselineRepository,
    private testResultRepository: ITestResultRepository,
    private fileStorageService: FileStorageService
  ) {}

  async executeTest(testRun: TestRun): Promise<TestRun> {
    const startTime = Date.now();
    
    try {
      logger.info(`Executing test: ${testRun.id} for URL: ${testRun.config.url}`);

      // Step 1: Capture screenshot
      const result = await this.playwrightService.captureScreenshot(
        testRun.config.url,
        testRun.config.viewport,
        {
          waitConditions: testRun.config.waitConditions,
          fullPage: true,
          captureDom: true,
          waitTime: 2000,
        }
      );

      logger.info(`Screenshot captured for test: ${testRun.id}`);
      
      // Store screenshot result in testRun
      testRun.result = {
        screenshot: result.screenshot,
        domSnapshot: result.domSnapshot,
        metadata: result.metadata,
      };

      // Step 2: Find matching baseline for comparison
      const baseline = await this.findMatchingBaseline(testRun);
      
      if (baseline) {
        logger.info(`Found baseline for comparison: ${baseline.id}`);
        
        // Step 3: Run visual diff
        const diffResult = await this.hybridDiffEngine.compareImages(
          baseline.image,
          result.screenshot,
          {
            forceAI: appConfig.ai.forceAI, // Use env variable
            pixelThreshold: appConfig.ai.pixelThreshold,
            aiThreshold: appConfig.ai.aiThreshold,
            context: {
              url: testRun.config.url,
              viewport: testRun.config.viewport,
            }
          }
        );

        // Step 4: Save images to filesystem (if enabled)
        const storedPaths = await this.fileStorageService.saveScreenshots({
          testId: testRun.id,
          projectId: testRun.projectId,
          baselineImage: baseline.image,
          currentImage: result.screenshot,
          diffImage: diffResult.diffImage,
          timestamp: new Date(),
        });

        // Step 5: Create test result
        const testResult = TestResult.create({
          id: uuidv4(),
          testRunId: testRun.id,
          baselineId: baseline.id,
          similarityScore: diffResult.pixelAnalysis.similarityScore,
          isDifferent: diffResult.isDifferent,
          diffRegions: diffResult.changes.map(change => change.region).filter(Boolean) as any[],
          screenshots: {
            current: result.screenshot,
            diff: diffResult.diffImage,
          },
          explanations: [diffResult.explanation],
          aiExplanation: diffResult.aiExplanation,
          metadata: {
            executionTime: Date.now() - startTime,
            aiModel: diffResult.aiDiff ? diffResult.metadata.aiProvider : undefined,
            tokensUsed: diffResult.metadata.tokensUsed,
            filePaths: storedPaths, // Add file paths to metadata
          },
        });

        // Step 6: Save test result
        await this.testResultRepository.create(testResult);
        
        // Add result to testRun
        (testRun as any).testResult = testResult;
        
        // Also store the diffResult with aiExplanation
        (testRun as any).diffResult = diffResult;
        
        // Update testRun in database with results
        testRun.result = {
          screenshot: result.screenshot,
          domSnapshot: result.domSnapshot,
          metadata: result.metadata,
          testResult: testResult,
          diffResult: diffResult,
        };
        
        logger.info(`Visual diff completed: ${testResult.status} (${diffResult.pixelAnalysis.similarityScore}% similarity)`, {
          filesStored: Object.keys(storedPaths).length > 0,
          storedPaths: Object.keys(storedPaths),
          hasAiExplanation: !!diffResult.aiExplanation
        });
      } else {
        logger.warn(`No baseline found for test: ${testRun.id}`);
        
        // Still save current screenshot for reference
        await this.fileStorageService.saveScreenshots({
          testId: testRun.id,
          projectId: testRun.projectId,
          currentImage: result.screenshot,
          timestamp: new Date(),
        });
      }

      return testRun;
    } catch (error) {
      logger.error(`Test execution failed: ${testRun.id}`, error);
      logger.info('Test execution debug info', {
        testId: testRun.id,
        url: testRun.config.url,
        error: error.message
      });
      throw error;
    }
  }

  private async findMatchingBaseline(testRun: TestRun) {
    // Check if a specific baseline ID was provided
    const baselineId = (testRun.config as any).baselineId;
    
    if (baselineId) {
      logger.info('Looking for specific baseline', { baselineId });
      const baseline = await this.baselineRepository.findById(baselineId);
      if (baseline && baseline.isActive) {
        logger.info('Found specific baseline', { baselineId: baseline.id });
        return baseline;
      }
    }
    
    // Fallback to URL matching if no specific baseline ID or baseline not found
    const baselines = await this.baselineRepository.findByProjectId(testRun.projectId);
    
    // Find baseline with matching URL
    const baseline = baselines.find(baseline => 
      baseline.metadata.url === testRun.config.url &&
      baseline.isActive
    ) || null;
    
    logger.info('Baseline search result', {
      testUrl: testRun.config.url,
      baselinesFound: baselines.length,
      matchingBaseline: baseline ? baseline.id : 'none',
      searchMethod: baselineId ? 'specific_id_fallback_to_url' : 'url_matching'
    });
    
    return baseline;
  }
}